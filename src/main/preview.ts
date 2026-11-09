import { WebContentsView, type BrowserWindow, type Rectangle } from 'electron';

export type Report = { kind: 'height' | 'pick'; payload: unknown };

/**
 * The site preview. It runs in its own session, with no bridge to the app:
 * a page (or a script an agent added to one) can only send back its height
 * and which element was clicked. Nothing else (plan item 1.8).
 */
export class Preview {
  private view: WebContentsView | null = null;
  private bounds: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  private window: BrowserWindow | null = null;
  private visible = false;

  attach(window: BrowserWindow, preloadPath: string): void {
    this.window = window;
    if (this.view) return;
    this.view = new WebContentsView({
      webPreferences: {
        preload: preloadPath,
        partition: 'cauldron-preview',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });
    window.contentView.addChildView(this.view);
  }

  /** Only a live view is safe to talk to; a closed window leaves a destroyed one behind. */
  get webContents() {
    const contents = this.view?.webContents;
    if (!contents || contents.isDestroyed()) return null;
    return contents;
  }

  get alive(): boolean {
    return Boolean(this.webContents);
  }

  show(): void {
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }

  setBounds(next: Rectangle): void {
    this.bounds = {
      x: Math.round(next.x),
      y: Math.round(next.y),
      width: Math.max(0, Math.round(next.width)),
      height: Math.max(0, Math.round(next.height)),
    };
    if (!this.view) return;
    this.view.setBounds(this.bounds);
    // A zero-size stage means the interface is not showing the build view
    // (project home or another panel): the preview must not cover it.
    this.setVisible(this.bounds.width > 0 && this.bounds.height > 0);
  }

  getBounds(): Rectangle {
    return this.bounds;
  }

  load(url: string): Promise<void> {
    const contents = this.webContents;
    if (!contents) return Promise.resolve();
    return contents.loadURL(url);
  }

  reload(): void {
    this.webContents?.reload();
  }

  setVisible(visible: boolean): void {
    if (!this.view) return;
    this.visible = visible;
    try {
      this.view.setVisible(visible);
    } catch {
      // The view went away with its window; nothing left to show.
    }
  }

  /**
   * Test-only introspection (used by CAULDRON_BACKGROUND_TEST runs): the real
   * layout state of the child view, without changing anything.
   */
  introspect(): {
    hasView: boolean;
    bounds: Rectangle;
    visible: boolean;
    url: string | null;
  } {
    const view = this.view;
    return {
      hasView: Boolean(view && !view.webContents.isDestroyed()),
      bounds: { ...this.bounds },
      visible: this.visible,
      url: this.webContents?.getURL() ?? null,
    };
  }

  /** The child page's own rendering, as a data URL (test-only). */
  async captureChild(): Promise<string | null> {
    const contents = this.webContents;
    if (!contents) return null;
    try {
      // stayHidden: the background test never shows the window, and a plain
      // capture of a hidden window's contents comes back empty.
      const image = await contents.capturePage(undefined, {
        stayHidden: true,
        stayAwake: true,
      });
      return image.isEmpty() ? null : image.toDataURL();
    } catch (err) {
      console.warn('[preview] Child view capture failed:', err);
      return null;
    }
  }

  /** The parent window's own capture, as a data URL (test-only). */
  async captureWindow(): Promise<string | null> {
    const window = this.window;
    if (!window || window.isDestroyed()) return null;
    try {
      const image = await window.capturePage(undefined, {
        stayHidden: true,
        stayAwake: true,
      });
      return image.isEmpty() ? null : image.toDataURL();
    } catch (err) {
      console.warn('[preview] Window capture failed:', err);
      return null;
    }
  }

  /** Safe to call twice, and after the window has already closed. */
  destroy(): void {
    const view = this.view;
    this.view = null;
    if (!view) return;

    const window = this.window;
    this.window = null;

    if (window && !window.isDestroyed()) {
      try {
        window.contentView.removeChildView(view);
      } catch {
        // Already detached by the window closing.
      }
    }
    if (!view.webContents.isDestroyed()) {
      try {
        view.webContents.close();
      } catch {
        // Nothing left to close.
      }
    }
  }
}
