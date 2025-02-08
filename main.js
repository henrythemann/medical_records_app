const { app, BrowserWindow, dialog, ipcMain, globalShortcut } = require('electron');
const DEBUG = process.env.DEBUG == 'true';
console.log('DEBUG:', DEBUG);
if (DEBUG)
  require('electron-reload')(__dirname);
const path = require('path');
const fs = require('fs');
const dicomParser = require('dicom-parser');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Optional, if you use preload scripts
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  // disable dev tools
  if (!DEBUG) {
    globalShortcut.register('Meta+Shift+I', () => {
      return false;
    });
  } else {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
});

ipcMain.on('set-full-screen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.setFullScreen(true);
});

ipcMain.on('exit-full-screen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.setFullScreen(false);
});

ipcMain.handle('save-viewport-image', async (event, { filePath, content }) => {
  try {
    const base64 = content.split(',')[1];
    const dataBuffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(filePath, dataBuffer);
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-save-dialog', async (event, { defaultPath, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save File As',
    defaultPath: defaultPath || 'untitled.png',
    filters: filters || [{ name: 'PNG Image', extensions: ['png'] }],
  });

  if (result.canceled) {
    return null; // User canceled the dialog
  }

  return result.filePath; // Return the selected file path
});

ipcMain.handle('open-file-dialog', async (event, { filters }) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open File',
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    properties: ['openFile', 'openDirectory', 'multiSelections'],
  });

  if (result.canceled) {
    return null; // User canceled the dialog
  }

  return result.filePaths.map(filePath => ({
    path: filePath,
    isFolder: fs.statSync(filePath).isDirectory(),
  }));
});

const getAllFiles = (dirPath) => {
  let fileList = [];
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    if (item.startsWith('.')) continue;
    const fullPath = path.join(dirPath, item);
    try {
      const stat = fs.lstatSync(fullPath); // Use `lstatSync` to check for symlinks

      if (stat.isSymbolicLink()) continue; // Skip symlinks to avoid errors
      if (stat.isDirectory()) {
        fileList = fileList.concat(getAllFiles(fullPath));
      } else {
        fileList.push(fullPath);
      }
    } catch (error) {
      console.error('Error reading file:', fullPath, error);
      continue;
    }
  }
  return fileList;
};

const checkDicomFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) return resolve({ filePath, isDicom: false, isInverted: null });

      // Check for DICOM prefix
      if (data.toString('utf8', 128, 132) !== 'DICM') {
        return resolve({ filePath, isDicom: false, isInverted: null });
      }

      try {
        // Convert Node.js Buffer to Uint8Array
        const dicomDataSet = dicomParser.parseDicom(new Uint8Array(data));
        const photometricInterpretation = dicomDataSet.string('x00280004');

        if (!photometricInterpretation) {
          return resolve({ filePath, isDicom: true, isInverted: null });
        }

        const isInverted = photometricInterpretation === 'MONOCHROME1';
        resolve({ filePath, isDicom: true, isInverted });
      } catch (e) {
        console.error('Error parsing DICOM:', e);
        resolve({ filePath, isDicom: false, isInverted: null });
      }
    });
  });
};


ipcMain.handle('find-dicom-files', async (event, { filePath }) => {
  if (filePath.isFolder) {
    const files = getAllFiles(filePath.path);
    const results = await Promise.all(files.map(checkDicomFile));
    return results.filter(result => result.isDicom);
  } else {
    return checkDicomFile(filePath.path).then((result) =>
      result.isDicom ? [result] : []
    );
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
