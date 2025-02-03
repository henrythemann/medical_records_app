const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setFullScreen: () => ipcRenderer.send('set-full-screen'),
  exitFullScreen: () => ipcRenderer.send('exit-full-screen'),
  saveViewportImage: ({filePath, content}) => ipcRenderer.invoke('save-viewport-image', { filePath, content }),
  openSaveDialog: ({defaultPath, filters}) => ipcRenderer.invoke('open-save-dialog', { defaultPath, filters }),
});