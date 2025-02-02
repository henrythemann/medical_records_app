const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setFullScreen: () => ipcRenderer.send('set-full-screen'),
  exitFullScreen: () => ipcRenderer.send('exit-full-screen'),
  saveFile: (filename, content) => ipcRenderer.invoke('save-file', { filename, content }),
});