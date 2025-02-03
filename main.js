const { app, BrowserWindow, dialog, ipcMain, globalShortcut } = require('electron');
const DEBUG = process.env.DEBUG == 'true';
console.log('DEBUG:', DEBUG);
if (DEBUG)
  require('electron-reload')(__dirname);
const path = require('path');
const fs = require('fs');

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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
