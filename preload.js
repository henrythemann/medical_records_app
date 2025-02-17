const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  init: () => ipcRenderer.send('init'),
  setFullScreen: () => ipcRenderer.send('set-full-screen'),
  exitFullScreen: () => ipcRenderer.send('exit-full-screen'),
  saveViewportImage: ({ filePath, content }) => ipcRenderer.invoke('save-viewport-image', { filePath, content }),
  openSaveDialog: ({ defaultPath, filters }) => ipcRenderer.invoke('open-save-dialog', { defaultPath, filters }),
  openFileDialog: ({ filters }) => ipcRenderer.invoke('open-file-dialog', { filters }),
  findDicomFiles: async ({ filePaths }) => {
    const results = [];
    for (let i = 0; i < filePaths.length; i++) {
      const result = await ipcRenderer.invoke('find-dicom-files', { filePath: filePaths[i] });
      if (result)
        results.push(...result);
    }
    return results;
  },
  createFolderIfNotExists: ({ folderPath }) => ipcRenderer.invoke('create-folder-if-not-exists', { folderPath }),
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
  getThumbsPath: () => ipcRenderer.invoke('get-thumbs-path'),
  joinPaths: ( paths ) => ipcRenderer.invoke('join-paths', { paths }),
  dbQuery: ({ query }) => ipcRenderer.invoke('db-query', { query }),
  decryptFile: ({ inFilePath, outFilePath, key }) => ipcRenderer.invoke('decrypt-file', { inFilePath, outFilePath, key }),
});