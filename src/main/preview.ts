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
    if (this.view) this.view.setBounds(this.bounds);
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
    try {
      this.view.setVisible(visible);
    } catch {
      // The view went away with its window; nothing left to show.
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
