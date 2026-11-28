import {
  WebContentsView,
  type BrowserWindow,
  type Rectangle,
  type WebContents,
} from 'electron';
import { configurePreviewSecurity, isNavigationAborted } from './preview';
import type { CompareFrame, CompareFrameId } from '../preview-compare';

/**
 * The compare frames: one extra preview view per breakpoint, each loading the
 * same local dev-server URL at its own CSS width.
 *
 * Deliberately separate from `Preview` rather than a mode inside it. Compare
 * frames keep their own locked-down session and security configuration, and
 * forward click-to-select picks back to the main process when Select mode is
 * active (WDL-244), while leaving inline editing and drag reordering to the
 * single preview.
 */
export class PreviewCompare {
  private views = new Map<CompareFrameId, WebContentsView>();
  private frames: CompareFrame[] = [];
  private picking = true;
  /**
   * Chromium resets the zoom factor of a WebContents to its remembered per-host
   * value when a page loads, so the factor has to be re-applied after every
   * navigation. Keeping the wanted value here is what makes that idempotent.
   */
  private zoomFor = new Map<CompareFrameId, number>();
  /** Diagnosis for the packaged-app probe; prints what was asked and what stuck. */
  readonly appliedLog: string[] = [];
  private window: BrowserWindow | null = null;
  private preloadPath = '';
  private url: string | null = null;
  /** Genuine load failures, per frame, for the interface and for tests. */
  private errors = new Map<CompareFrameId, string>();
  /** Monotonic per-frame navigation token to prevent stale ERR_ABORTED retries. */
  private loadSeq = new Map<CompareFrameId, number>();

  attach(window: BrowserWindow, preloadPath: string): void {
    this.window = window;
    this.preloadPath = preloadPath;
  }

  get enabled(): boolean {
    return this.frames.length > 0;
  }

  /** Whether a WebContents belongs to one of the active compare frames. */
  hasWebContents(contents: WebContents): boolean {
    for (const view of this.views.values()) {
      if (!view.webContents.isDestroyed() && view.webContents === contents) {
        return true;
      }
    }
    return false;
  }

  /** Propagates Select mode to all active and future compare frames. */
  setPickMode(on: boolean): void {
    this.picking = Boolean(on);
    for (const view of this.views.values()) {
      if (!view.webContents.isDestroyed()) {
        view.webContents.send('preview:compare-frame', true);
        view.webContents.send('preview:mode', this.picking);
      }
    }
  }

  /** Point any not-yet-loaded frames at a URL without disturbing the rest. */
  setUrl(url: string): void {
    this.url = url;
  }

  /** Same URL as the single preview; a compare frame never navigates itself. */
  async load(url: string): Promise<void> {
    this.url = url;
    if (!this.enabled) return;
    await Promise.all(
      [...this.views.entries()].map(([id, view]) =>
        this.loadInto(id, view, url),
      ),
    );
  }

  /**
   * Astro reloads routes while a load is in flight, so an abort is routine and
   * retried once. Anything else — a refused connection, a dead dev server —
   * leaves an empty column, so it is recorded and logged rather than swallowed
   * as if the page had rendered.
   */
  private async loadInto(
    id: CompareFrameId,
    view: WebContentsView,
    url: string,
  ): Promise<void> {
    if (view.webContents.isDestroyed()) return;
    const token = (this.loadSeq.get(id) ?? 0) + 1;
    this.loadSeq.set(id, token);
    try {
      await view.webContents.loadURL(url);
      if (this.loadSeq.get(id) !== token) return;
      this.errors.delete(id);
    } catch (error) {
      if (this.loadSeq.get(id) !== token || view.webContents.isDestroyed())
        return;
      if (!isNavigationAborted(error)) {
        this.recordError(id, error);
      } else {
        try {
          await view.webContents.loadURL(url);
          if (this.loadSeq.get(id) !== token) return;
          this.errors.delete(id);
        } catch (retryError) {
          if (this.loadSeq.get(id) !== token) return;
          if (!isNavigationAborted(retryError))
            this.recordError(id, retryError);
        }
      }
    }
    if (this.loadSeq.get(id) === token) {
      this.applyZoom(id, view);
    }
  }

  private recordError(id: CompareFrameId, error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    this.errors.set(id, detail);
    console.error(`compare frame ${id} failed to load: ${detail}`);
  }

  /** The failure each frame is currently showing, if any. */
  get failures(): Record<string, string> {
    return Object.fromEntries(this.errors);
  }

  reload(): void {
    for (const view of this.views.values()) {
      if (!view.webContents.isDestroyed()) view.webContents.reload();
    }
  }

  /**
   * Place the frames. Called on every resize, so this must be cheap: bounds and
   * zoom are set directly, and views are only created or destroyed when the set
   * of frames changes.
   */
  setFrames(frames: readonly CompareFrame[]): void {
    const window = this.window;
    if (!window || window.isDestroyed()) {
      this.frames = [];
      return;
    }
    const wanted = frames.filter(
      (frame) => frame.width > 0 && frame.height > 0,
    );
    const ids = new Set(wanted.map((frame) => frame.id));

    for (const [id, view] of this.views) {
      if (ids.has(id)) continue;
      this.views.delete(id);
      this.loadSeq.delete(id);
      this.removeView(window, view);
    }

    for (const frame of wanted) {
      // Record the wanted zoom *before* anything can navigate: the load-finish
      // handler reads this map, and a fast local page can finish loading in the
      // gap between starting the load and reaching the bottom of this loop.
      this.zoomFor.set(frame.id, frame.zoom);
      let view = this.views.get(frame.id);
      if (!view) {
        const created = this.createView(window, frame.id);
        if (!created) continue;
        view = created;
        this.views.set(frame.id, view);
        // Every navigation resets the zoom, so it is re-applied once the page
        // has committed. Registered here, at creation: the per-resize path below
        // fires while the first load is still in flight and cannot apply it.
        const frameView = view;
        frameView.webContents.on('dom-ready', () => {
          this.applyZoom(frame.id, frameView);
          frameView.webContents.send('preview:compare-frame', true);
          frameView.webContents.send('preview:mode', this.picking);
        });
        frameView.webContents.on('did-finish-load', () => {
          this.applyZoom(frame.id, frameView);
          frameView.webContents.send('preview:compare-frame', true);
          frameView.webContents.send('preview:mode', this.picking);
        });
        if (this.url) void this.loadInto(frame.id, frameView, this.url);
      }
      if (view.webContents.isDestroyed()) continue;
      // Zoom keeps the layout width at the breakpoint while the view is sized
      // for the column: media queries see 375/768/1280, the eye sees them fit.
      // Before the first navigation commits Chromium discards a zoom factor
      // (proved against a bare WebContentsView: pre-load calls were ignored,
      // post-load ones stick), so apply now only if the page has settled, and
      // otherwise let did-finish-load do it.
      if (!view.webContents.isLoading()) this.applyZoom(frame.id, view);
      view.setBounds({
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
      } satisfies Rectangle);
      view.setVisible(true);
    }
    this.frames = wanted;
  }

  /** Drop the frames and their processes; called when compare is turned off. */
  clear(): void {
    this.errors.clear();
    this.loadSeq.clear();
    const window = this.window;
    for (const view of this.views.values()) {
      if (window && !window.isDestroyed()) this.removeView(window, view);
      else this.closeView(view);
    }
    this.views.clear();
    this.zoomFor.clear();
    this.frames = [];
  }

  /** Mirrors the single preview's health, for the packaged-app probes. */
  introspect(): { frames: number; urls: (string | null)[]; zoomed: number[] } {
    const views = [...this.views.values()].filter(
      (view) => !view.webContents.isDestroyed(),
    );
    return {
      frames: views.length,
      urls: views.map((view) => view.webContents.getURL() || null),
      zoomed: views.map((view) => view.webContents.getZoomFactor()),
    };
  }

  /**
   * What each frame actually believes: its CSS viewport width is the number that
   * matters, because that is what media queries respond to. Zoom is reported
   * alongside it so a mismatch is obvious rather than inferred.
   */
  async inspectFrames(): Promise<
    {
      id: CompareFrameId;
      zoom: number;
      innerWidth: number | null;
      bounds: Rectangle;
    }[]
  > {
    const out: {
      id: CompareFrameId;
      zoom: number;
      innerWidth: number | null;
      bounds: Rectangle;
      png: string | null;
    }[] = [];
    for (const [id, view] of this.views) {
      if (view.webContents.isDestroyed()) continue;
      let innerWidth: number | null = null;
      try {
        innerWidth = (await view.webContents.executeJavaScript(
          'window.innerWidth',
        )) as number;
      } catch {
        // A frame mid-navigation answers nothing; that is not a failure.
      }
      // The window's own screenshot does not include WebContentsView children,
      // so evidence of what a frame actually painted has to come from the frame.
      let png: string | null = null;
      try {
        // Same flags the single preview's test capture uses: a plain capture
        // comes back empty when the window is not front-most.
        const image = await view.webContents.capturePage(undefined, {
          stayHidden: true,
          stayAwake: true,
        });
        png = image.isEmpty() ? null : image.resize({ width: 360 }).toDataURL();
      } catch {
        // Nothing to capture while navigating.
      }
      out.push({
        id,
        zoom: view.webContents.getZoomFactor(),
        innerWidth,
        bounds: view.getBounds(),
        png,
      });
    }
    return out;
  }

  destroy(): void {
    this.clear();
    this.window = null;
    this.url = null;
  }

  private applyZoom(id: CompareFrameId, view: WebContentsView): void {
    const zoom = this.zoomFor.get(id);
    if (zoom === undefined || view.webContents.isDestroyed()) return;
    // Measured against a bare WebContentsView on this Electron build:
    //  - `webPreferences.zoomFactor` sets the value that is *reported* but the
    //    page keeps painting at 1:1;
    //  - `setZoomFactor` after a load does scale, but calling it with a value
    //    equal to the current one changes nothing, so the page can stay at 1:1
    //    while reporting the factor we asked for.
    // Going via 1 first makes the call a real change every time.
    const before = view.webContents.getZoomFactor();
    if (Math.abs(before - zoom) < 0.001) {
      view.webContents.setZoomFactor(1);
    }
    view.webContents.setZoomFactor(zoom);
    const after = view.webContents.getZoomFactor();
    if (this.appliedLog.length < 60) {
      this.appliedLog.push(
        `${id} wanted=${zoom.toFixed(3)} before=${before.toFixed(3)} after=${after.toFixed(3)}`,
      );
    }
  }

  private createView(
    window: BrowserWindow,
    id: CompareFrameId,
  ): WebContentsView | null {
    try {
      const view = new WebContentsView({
        webPreferences: {
          preload: this.preloadPath,
          // Dedicated in-memory session per compare frame: Chromium stores
          // per-origin zoom factors per session, so sharing one partition across
          // phone/tablet/desktop frames let sibling zoom updates overwrite each
          // other. No `persist:` prefix, so nothing is stored on disk.
          partition: `cauldron-preview-compare-${id}`,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
        },
      });
      configurePreviewSecurity(view.webContents);
      window.contentView.addChildView(view);
      return view;
    } catch (err) {
      console.warn('[preview-compare] Could not create a frame:', err);
      return null;
    }
  }

  private removeView(window: BrowserWindow, view: WebContentsView): void {
    try {
      window.contentView.removeChildView(view);
    } catch {
      // Already detached.
    }
    this.closeView(view);
  }

  private closeView(view: WebContentsView): void {
    if (view.webContents.isDestroyed()) return;
    try {
      view.webContents.close();
    } catch {
      // Nothing left to close.
    }
  }
}
