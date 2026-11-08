"use strict";
const electron = require("electron");
const api = {
  // File operations
  newProject: () => electron.ipcRenderer.invoke("file:new"),
  openProjectFolder: () => electron.ipcRenderer.invoke("file:open"),
  saveProjectFiles: (payload) => electron.ipcRenderer.invoke("file:save", payload),
  writeProjectFile: (filePath, content) => electron.ipcRenderer.invoke("file:write", filePath, content),
  writeBinaryProjectFile: async (filePath, content) => {
    try {
      return await electron.ipcRenderer.invoke("file:write-binary", filePath, content);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (!detail.includes("No handler registered for 'file:write-binary'")) throw error;
      return electron.ipcRenderer.invoke("file:write", filePath, content);
    }
  },
  createProjectDirectory: (directoryPath) => electron.ipcRenderer.invoke("file:mkdir", directoryPath),
  renameProjectFile: (oldPath, newPath) => electron.ipcRenderer.invoke("file:rename", oldPath, newPath),
  copyProjectPath: (sourcePath, destinationPath) => electron.ipcRenderer.invoke("file:copy", sourcePath, destinationPath),
  deleteProjectFile: (filePath) => electron.ipcRenderer.invoke("file:delete", filePath),
  pickAssets: () => electron.ipcRenderer.invoke("asset:pick"),
  watchProjectFolder: (folderPath) => electron.ipcRenderer.invoke("project:watch", folderPath),
  unwatchProjectFolder: () => electron.ipcRenderer.invoke("project:unwatch"),
  reloadProjectFolder: (folderPath) => electron.ipcRenderer.invoke("project:reload-folder", folderPath),
  openProjectPath: (pathLike) => electron.ipcRenderer.invoke("project:open-path", pathLike),
  setEmulatedMediaFeatures: (features) => electron.ipcRenderer.invoke("browser:set-emulated-media-features", features),
  // Source file operations
  saveSourcePage: (folderPath, relativePath, root, components) => electron.ipcRenderer.invoke("source:save-page", folderPath, relativePath, root, components),
  saveComponentFile: (folderPath, component, components) => electron.ipcRenderer.invoke("source:save-component", folderPath, component, components),
  deleteComponentFile: (folderPath, componentName) => electron.ipcRenderer.invoke("source:delete-component", folderPath, componentName),
  hasSourceDirectory: (folderPath) => electron.ipcRenderer.invoke("source:has-source-dir", folderPath),
  publishToPublic: (folderPath, pageDocuments, files) => electron.ipcRenderer.invoke("source:publish-to-public", folderPath, pageDocuments, files),
  // License
  getLicenseStatus: () => electron.ipcRenderer.invoke("license:get-status"),
  activateLicense: (key) => electron.ipcRenderer.invoke("license:activate", key),
  // Menu events
  onMenuAction: (callback) => {
    const actions = ["menu:new-project", "menu:open", "menu:save", "menu:undo", "menu:redo"];
    const handlers = actions.map((action) => {
      const handler = () => callback(action.replace("menu:", ""));
      electron.ipcRenderer.on(action, handler);
      return { action, handler };
    });
    return () => {
      handlers.forEach(({ action, handler }) => electron.ipcRenderer.removeListener(action, handler));
    };
  },
  onProjectOpened: (callback) => {
    const handler = (_event, project) => callback(project);
    electron.ipcRenderer.on("project:opened", handler);
    return () => electron.ipcRenderer.removeListener("project:opened", handler);
  },
  onProjectChanged: (callback) => {
    const handler = (_event, project) => callback(project);
    electron.ipcRenderer.on("project:changed", handler);
    return () => electron.ipcRenderer.removeListener("project:changed", handler);
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
