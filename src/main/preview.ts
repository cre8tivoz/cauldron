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

  get webContents() {
    return this.view?.webContents ?? null;
  }

  show(): void {
    if (this.view) this.view.setVisible(true);
  }

  hide(): void {
    if (this.view) this.view.setVisible(false);
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
    if (!this.view) return Promise.resolve();
    return this.view.webContents.loadURL(url).catch(() => undefined);
  }

  reload(): void {
    this.view?.webContents.reload();
  }

  destroy(): void {
    if (!this.view) return;
    if (this.window) this.window.contentView.removeChildView(this.view);
    this.view.webContents.close();
    this.view = null;
  }
}
