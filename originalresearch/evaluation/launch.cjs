// Isolated evaluation launcher. No application-source modifications.
const path = require('node:path');
const fs = require('node:fs');
const { app, dialog } = require('electron');
const root = __dirname;
const data = path.join(root, 'user-data');
fs.mkdirSync(data, { recursive: true });
app.setPath('userData', data);
app.setPath('sessionData', path.join(data, 'session'));
app.setName('Stacki Evaluation');
app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
app.commandLine.appendSwitch('remote-debugging-port', '9334');
// Keep evaluation telemetry off from first launch.
fs.writeFileSync(path.join(data, 'settings.json'), JSON.stringify({ usageCountsEnabled: false, usageNoticeVersion: 1 }));
const realOpen = dialog.showOpenDialog.bind(dialog);
dialog.showOpenDialog = async (...args) => {
  const options = args.at(-1);
  if (options?.title === 'Open an Astro project') {
    console.log('[evaluation] Native folder-picker result supplied: disposable site');
    return { canceled: false, filePaths: [path.join(root, 'site')] };
  }
  return realOpen(...args);
};
app.on('web-contents-created', (_event, contents) => {
  contents.on('console-message', (_event, level, message) => {
    if (level >= 2) console.log('[renderer]', level, message);
  });
  contents.on('render-process-gone', (_event, detail) => console.error('[render-process-gone]', detail));
});
require('./stacki/dist/electron/main.js');
