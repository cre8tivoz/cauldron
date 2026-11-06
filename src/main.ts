import { app, BrowserWindow } from 'electron';
import path from 'node:path';

// Smoke mode: open the window hidden, confirm the interface rendered, then quit.
// Used by `npm run smoke` and CI, so checks never pop a window on screen.
const SMOKE = process.env.CAULDRON_SMOKE === '1';

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    show: !SMOKE,
    title: 'Cauldron',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

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
      if (text.includes('Cauldron')) {
        console.log('SMOKE PASS: window created and interface rendered');
        app.exit(0);
      } else {
        console.error('SMOKE FAIL: interface root was empty');
        app.exit(1);
      }
    });
  }
};

app.whenReady().then(() => {
  if (SMOKE && process.platform === 'darwin') app.dock?.hide();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
