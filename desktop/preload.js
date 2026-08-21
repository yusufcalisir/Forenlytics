const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,
  getBackendPort: () => ipcRenderer.invoke("get-backend-port"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),
  openAudioFileDialog: (title) => ipcRenderer.invoke("open-audio-dialog", title),
  saveReportDialog: (data, defaultName) => ipcRenderer.invoke("save-report-dialog", { data, defaultName }),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  onBackendStatus: (callback) => {
    ipcRenderer.on("backend-status", (_, status) => callback(status));
  }
});
