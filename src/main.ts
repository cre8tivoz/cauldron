import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { buildMenu } from './app-menu';

// Smoke mode: open the window hidden, confirm the interface rendered, then quit.
// Used by `npm run smoke` and CI, so checks never pop a window on screen.
const SMOKE = process.env.CAULDRON_SMOKE === '1';
const DEV = Boolean(MAIN_WINDOW_VITE_DEV_SERVER_URL);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    show: !SMOKE,
    title: 'Cauldron',
    backgroundColor: '#0b0b0c',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  // A link in the interface opens in the real browser, never inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const dev = MAIN_WINDOW_VITE_DEV_SERVER_URL;
    if (!dev || !url.startsWith(dev)) event.preventDefault();
  });

  mainWindow.once('ready-to-show', () => {
    if (!SMOKE) mainWindow.show();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (DEV && !SMOKE) mainWindow.webContents.openDevTools({ mode: 'detach' });

  if (SMOKE) {
    const fail = setTimeout(() => {
      console.error('SMOKE FAIL: interface did not render within 15s');
      app.exit(1);
    }, 15000);
    mainWindow.webContents.on('did-finish-load', async () => {
      const text: string = await mainWindow.webContents.executeJavaScript(
        "document.querySelector('#root')?.textContent ?? ''",
      );
      clearTimeout(fail);
      // Set CAULDRON_SHOT to keep a picture of the window for checking.
      const shot = process.env.CAULDRON_SHOT;
      if (shot) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const image = await mainWindow.webContents.capturePage();
        fs.writeFileSync(shot, image.toPNG());
        console.log(`SMOKE SHOT: ${shot}`);
      }
      if (text.includes('Cauldron')) {
        console.log('SMOKE PASS: window created and interface rendered');
        app.exit(0);
      } else {
        console.error('SMOKE FAIL: interface root was empty');
        app.exit(1);
      }
    });
  }

  return mainWindow;
}

// One copy of Cauldron at a time. A second launch focuses the window instead.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  app.whenReady().then(() => {
    if (SMOKE && process.platform === 'darwin') app.dock?.hide();
    Menu.setApplicationMenu(buildMenu());
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
