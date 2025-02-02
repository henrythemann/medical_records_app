const { app, BrowserWindow, ipcMain } = require('electron');
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
  // globalShortcut.register('Control+Shift+I', () => {
  //   return false;
  // });
  mainWindow.webContents.openDevTools();
  // Load your React app
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

ipcMain.handle('save-file',async (event, { filename, content }) => {
  try {
    const dataBuffer = Buffer.from(content);
    const filePath = path.join(app.getPath('downloads'), filename);
    fs.writeFileSync(filePath, dataBuffer, 'utf8');
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
