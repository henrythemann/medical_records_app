const { app, BrowserWindow, dialog, ipcMain, globalShortcut } = require('electron');
const DEBUG = process.env.DEBUG == 'true';
console.log('DEBUG:', DEBUG);
if (DEBUG)
  require('electron-reload')(__dirname);
const path = require('path');
const fs = require('fs');
const dicomParser = require('dicom-parser');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');
const dicomFields = require('./dicomFieldsSmall.json');

let mainWindow;
const appDataPath = app.getPath('userData');
const thumbsPath = path.join(appDataPath, 'thumbs');
const dicomPath = path.join(appDataPath, 'dicom');
const dbPath = path.join(appDataPath, 'db.sqlite');
const isDev = process.defaultApp || /electron-prebuilt/.test(process.execPath);
const decryptPath = isDev
  ? path.join(__dirname, 'DotnetDecryptDll', 'bin', 'Release', 'net9.0', 'osx-arm64', 'publish', 'DotnetDecryptDll')
  : path.join(process.resourcesPath, 'DotnetDecryptDll');

app.on('ready', async () => {
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
ipcMain.on('init', async (event) => {
  // Ensure the database directory exists
  await createFolderIfNotExists(thumbsPath);
  await createFolderIfNotExists(dicomPath);

  // Connect to SQLite (this will create the database file if it doesn't exist)
  const db = new Database(dbPath);
  const query = `
    CREATE TABLE IF NOT EXISTS imaging (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filePath TEXT UNIQUE NOT NULL,
      thumbPath TEXT UNIQUE NOT NULL,
      ${Object.keys(dicomFields).map(key => `${key} ${getDicomValue({ key, getType: true })}${key === 'sopInstanceUid' ? ' UNIQUE NOT NULL' : ''}`).join(',\n')}
    );
  `;
  db.exec(query);
  db.close();
});
ipcMain.handle('db-query', async (event, { query, params = [] }) => {
  return await executeQuery({ query, params });
});
const executeQuery = async ({query, params = []}) => {
  let db;
  try {
    db = new Database(dbPath, { readonly: false }); // Open in read/write mode
    const stmt = db.prepare(query);
  
    // Check if it's a SELECT query
    if (/^\s*SELECT/i.test(query)) {
      const rows = stmt.all(...params); // Fetch multiple rows
      return { success: true, data: rows };
    } else {
      const result = stmt.run(...params); // Execute non-SELECT query
      return { success: true, changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    }
  } catch (error) {
    console.error('Database query error:', error);
    return { success: false, error: error.message };
  } finally {
    if (db) db.close(); // Ensure database is closed
  }
};
ipcMain.handle('db-add-image', async (event, { columns }) => {
  try {
    const query = `INSERT INTO imaging (filePath, thumbPath, ${columns.metadata.map(x => x.key).join(',')}) VALUES (?, ?, ${columns.metadata.map(x => '?').join(', ')})`;
    let params = [columns.filePath, columns.thumbPath];
    console.log('filePath:', columns.filePath);
    for (let i = 0; i < columns.metadata.length; i++) {
      params.push(columns.metadata[i].value);
    }
    const result = executeQuery({ query, params })
    return result;
  } catch (error) {
    console.error('Database insert error:', error);
    return { success: false, error: error.message };
  } 
});
ipcMain.handle('get-app-data-path', () => {
  return appDataPath;
});
ipcMain.handle('get-thumbs-path', () => {
  return thumbsPath;
});
ipcMain.handle('get-dicom-path', () => {
  return dicomPath;
});
ipcMain.handle('join-paths', (event, { paths }) => {
  return path.join(...paths);
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

ipcMain.handle('copy-file', async (event, { srcPath, destPath }) => {
  try {
    await fs.promises.copyFile(srcPath, destPath, fs.constants.COPYFILE_EXCL);
    return destPath;
  } catch (err) {
    console.error('Error copying file:', err);
    throw err;
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

const getDicomValue = ({ dicomDataSet, key, getType = false }) => {
  const vr = dicomFields[key]?.vr.substring(0, 2);
  const bytes = dicomFields[key]?.bytes;
  try {
    switch (vr) {
      case 'AE': case 'AS': case 'CS': case 'DA': case 'DT': case 'LO':
      case 'LT': case 'PN': case 'SH': case 'ST': case 'UC': case 'UI':
      case 'UR': case 'TM': case 'UT': {
        return getType ? 'TEXT' : dicomDataSet.string(bytes); // Text-based VRs
      }
      case 'DS': case 'IS': {
        return getType ? 'TEXT' : dicomDataSet.string(bytes); // Numeric as string
      }
      case 'US': case 'SS': {
        return getType ? 'INTEGER' : dicomDataSet.uint16(bytes) || dicomDataSet.int16(bytes); // 16-bit integers
      }
      case 'UL': case 'SL': {
        return getType ? 'INTEGER' : dicomDataSet.uint32(bytes) || dicomDataSet.int32(bytes); // 32-bit integers
      }
      case 'FL': {
        return getType ? 'REAL' : dicomDataSet.float(bytes); // 32-bit float
      }
      case 'FD': {
        return getType ? 'REAL' : dicomDataSet.double(bytes); // 64-bit float
      }
      case 'SQ':
        // console.log('Sequence, not doing it');
        return null;
      // return dicomDataSet.elements[bytes] || null; // Sequences

      case 'OB': case 'OW': case 'UN': case 'OL': case 'OV':
        // console.log('byteArray, not doing it');
        return null;
      // return dicomDataSet.byteArray(tag); // Binary data

      default:
        // console.warn(`Unhandled VR: ${vr} for tag ${key}`);
        return null;
    }
  } catch (error) {
    console.error(`Error retrieving tag ${key}:`, error);
    return null;
  }
};

const checkDicomFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) return resolve(false);
      const encryptedHeader = Buffer.from([48, 128, 6, 9, 42, 134, 72, 134, 247, 13, 1, 7, 3]);

      // Check if encrypted
      if (data.subarray(0, 13).equals(encryptedHeader)) {
        return resolve({ filePath, isEncrypted: true, isInverted: null, metadata: [] });
      }
      // Check for DICOM prefix
      if (data.toString('utf8', 128, 132) !== 'DICM') {
        return resolve(false);
      }

      try {
        // Convert Node.js Buffer to Uint8Array
        const dicomDataSet = dicomParser.parseDicom(new Uint8Array(data));
        const photometricInterpretation = getDicomValue({ dicomDataSet, key: 'photometricInterpretation' });
        const vars =
          Object.keys(dicomFields)
            .map(key => {
              return {
                title: dicomFields[key].title,
                value: getDicomValue({ dicomDataSet, key }),
                key
              }
            })
            .filter(el => el.value !== null && el.value !== undefined);
        if (!photometricInterpretation) {
          return resolve({ filePath, isEncrypted: false, isInverted: null, metadata: vars });
        }

        const isInverted = photometricInterpretation === 'MONOCHROME1';
        resolve({ filePath, isEncrypted: false, isInverted, metadata: vars });
      } catch (e) {
        console.error('Error parsing DICOM:', e);
        resolve(false);
      }
    });
  });
};

ipcMain.handle('find-dicom-files', async (event, { filePath }) => {
  if (filePath.isFolder) {
    const files = getAllFiles(filePath.path);
    const results = await Promise.all(files.map(checkDicomFile));
    return results.filter(result => result !== false);
  } else {
    return checkDicomFile(filePath.path).then((result) =>
      result ? [result] : []
    );
  }
});

ipcMain.handle('decrypt-file', async (event, { inFilePath, outFilePath, key }) => {
  let output = '';

  // Spawn the process (only need to pipe stdout if that's what you care about)
  const child = spawn(decryptPath, [inFilePath, outFilePath, key], { stdio: ['ignore', 'pipe', 'pipe'] });
  
  // Set encoding so we work with strings
  child.stdout.setEncoding('utf8');
  
  // Accumulate stdout data as it comes in
  for await (const chunk of child.stdout) {
    output += chunk;
  }

  // Wait for the process to complete
  const exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });

  if (exitCode !== 0) {
    throw new Error(`Decryption failed with exit code ${exitCode}: ${output}`);
  }
  return output;
});



const createFolderIfNotExists = async (folderPath) => {
  try {
    await fs.promises.mkdir(folderPath, { recursive: true });
    return true;
  } catch (err) {
    console.error(`Error creating folder: ${err.message}`);
    return false;
  }
}

ipcMain.handle('create-folder-if-not-exists', async (event, { folderPath }) => {
  return createFolderIfNotExists(folderPath);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
