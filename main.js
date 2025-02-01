const { app, BrowserWindow } = require('electron');
require('electron-reload')(__dirname);
const path = require('path');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Optional, if you use preload scripts
      nodeIntegration: true, // Enable Node.js in your renderer
      contextIsolation: false, // For React development
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
