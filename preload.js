const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  init: () => ipcRenderer.send('init'),
  setFullScreen: () => ipcRenderer.send('set-full-screen'),
  exitFullScreen: () => ipcRenderer.send('exit-full-screen'),
  saveViewportImage: ({ filePath, content }) => ipcRenderer.invoke('save-viewport-image', { filePath, content }),
  openSaveDialog: ({ defaultPath, filters }) => ipcRenderer.invoke('open-save-dialog', { defaultPath, filters }),
  openFileDialog: ({ filters }) => ipcRenderer.invoke('open-file-dialog', { filters }),
  createFolderIfNotExists: ({ folderPath }) => ipcRenderer.invoke('create-folder-if-not-exists', { folderPath }),
  copyFile: ({ srcPath, destPath }) => ipcRenderer.invoke('copy-file', { srcPath, destPath }),
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
  getThumbsPath: () => ipcRenderer.invoke('get-thumbs-path'),
  getDicomPath: () => ipcRenderer.invoke('get-dicom-path'),
  joinPaths: ( paths ) => ipcRenderer.invoke('join-paths', { paths }),
  dbQuery: ({ query, params }) => ipcRenderer.invoke('db-query', { query, params }),
  dbAddImage: (columns) => ipcRenderer.invoke('db-add-image', {columns}),
  decryptFile: ({ inFilePath, outFilePath, key }) => ipcRenderer.invoke('decrypt-file', { inFilePath, outFilePath, key }),
  saveThumbnail: ({ filePath, outputPath }) => ipcRenderer.invoke('save-thumbnail', { filePath, outputPath }),
  importFiles: ({ filePaths, firstPass, encryptedSet, showMessage }) => ipcRenderer.invoke('import-files', { filePaths, firstPass, encryptedSet, showMessage }),
});