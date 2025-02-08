const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setFullScreen: () => ipcRenderer.send('set-full-screen'),
  exitFullScreen: () => ipcRenderer.send('exit-full-screen'),
  saveViewportImage: ({ filePath, content }) => ipcRenderer.invoke('save-viewport-image', { filePath, content }),
  openSaveDialog: ({ defaultPath, filters }) => ipcRenderer.invoke('open-save-dialog', { defaultPath, filters }),
  openFileDialog: ({ filters }) => ipcRenderer.invoke('open-file-dialog', { filters }),
  findDicomFiles: async ({ filePaths }) => {
    for (let i = 0; i < filePaths.length; i++) {
      const result = await ipcRenderer.invoke('find-dicom-files', { filePath: filePaths[i] });
      if (result)
        return result;
    }
    return null;
  }
});