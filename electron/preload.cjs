const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // PTY
  ptySpawn: (sessionId, options) => ipcRenderer.invoke("pty:spawn", sessionId, options),
  ptyWrite: (sessionId, data) => ipcRenderer.invoke("pty:write", sessionId, data),
  ptyResize: (sessionId, cols, rows) => ipcRenderer.invoke("pty:resize", sessionId, cols, rows),
  ptyKill: (sessionId) => ipcRenderer.invoke("pty:kill", sessionId),

  onPtyOutput: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("pty:output", handler);
    return () => ipcRenderer.removeListener("pty:output", handler);
  },

  onPtyExit: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("pty:exit", handler);
    return () => ipcRenderer.removeListener("pty:exit", handler);
  },

  // Window controls
  windowMinimize: () => ipcRenderer.invoke("window:minimize"),
  windowMaximize: () => ipcRenderer.invoke("window:maximize"),
  windowClose: () => ipcRenderer.invoke("window:close"),
  windowSetOpacity: (opacity) => ipcRenderer.invoke("window:setOpacity", opacity),

  // Updater
  updaterDownload: () => ipcRenderer.invoke("updater:download"),
  updaterInstall: () => ipcRenderer.invoke("updater:install"),
  updaterCheck: () => ipcRenderer.invoke("updater:check"),
  updaterGetVersion: () => ipcRenderer.invoke("updater:getVersion"),

  onUpdaterAvailable: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("updater:available", handler);
    return () => ipcRenderer.removeListener("updater:available", handler);
  },

  onUpdaterProgress: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("updater:progress", handler);
    return () => ipcRenderer.removeListener("updater:progress", handler);
  },

  onUpdaterDownloaded: (callback) => {
    const handler = (_event) => callback();
    ipcRenderer.on("updater:downloaded", handler);
    return () => ipcRenderer.removeListener("updater:downloaded", handler);
  },

  // Utilities
  getAvailableShells: () => ipcRenderer.invoke("util:getShells"),
  selectDirectory: () => ipcRenderer.invoke("util:selectDirectory"),
  selectProgram: () => ipcRenderer.invoke("util:selectProgram"),
  openExternal: (url) => ipcRenderer.invoke("util:openExternal", url),
});
