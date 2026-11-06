import { contextBridge } from 'electron';

// The interface learns only these facts about the app it's running in.
contextBridge.exposeInMainWorld('cauldron', {
  version: process.env.npm_package_version ?? '',
  platform: process.platform,
});
