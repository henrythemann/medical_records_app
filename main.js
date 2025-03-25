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
const dicomFields = require('./dicomFields.json');
const dicomFieldsSmall = require('./dicomFieldsSmall.json');

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
      ${Object.keys(dicomFieldsSmall).map(key => `${key} ${getDicomValue({ key, getType: true })}${key === 'sopInstanceUid' ? ' UNIQUE NOT NULL' : ''}`).join(',\n')}
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
  return copyFile({ srcPath, destPath });
});

const copyFile = async ({ srcPath, destPath }) => {
  try {
    await fs.promises.copyFile(srcPath, destPath, fs.constants.COPYFILE_EXCL);
    return destPath;
  } catch (err) {
    console.error('Error copying file:', err);
    throw err;
  }
};

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

ipcMain.handle('save-thumbnail', async (event, { filePath, outputPath }) => {
  return saveThumbnail({ filePath, outputPath });
});

const saveThumbnail = async ({filePath, outputPath}) => {
  await fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error('Error reading file:', filePath, err);
      return resolve({ success: false, error: err.message });
    }
    try {
  const dicomDataSet = dicomParser.parseDicom(new Uint8Array(data));
  const width = getDicomValue({ dicomDataSet, key: 'columns' });
  const height = getDicomValue({ dicomDataSet, key: 'rows' });
  const invert = getDicomValue({ dicomDataSet, key: 'photometricInterpretation' }) === 'MONOCHROME1';
  const pixelData = getDicomValue({ dicomDataSet, key: 'pixelData' });
  // const floatPixelData = getDicomValue({ dicomDataSet, key: 'floatPixelData' });
  // const doubleFloatPixelData = getDicomValue({ dicomDataSet, key: 'doubleFloatPixelData' });
  console.log('pixelData',pixelData);
  // console.log('floatPixelData',floatPixelData);
  // console.log('doubleFloatPixelData',doubleFloatPixelData);

  
  // get whether it's inverted or not
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < pixelData.length; i++) {
    const v = pixelData[i];
    if (v < minVal) {
      minVal = v;
    }
    if (v > maxVal) {
      maxVal = v;
    }
  }
  const range = maxVal - minVal || 1;
  const png = new PNG({ width, height, filterType: -1 });

  // 4. Loop over every pixel, scale to [0..255]
  for (let i = 0; i < width * height; i++) {
    const value = pixelData[i];
    let gray = ((value - minVal) / range) * 255;
    if (invert) gray = 255 - gray;
    
    const idx = i * 4;
    png.data[idx + 0] = gray;  // Red
    png.data[idx + 1] = gray;  // Green
    png.data[idx + 2] = gray;  // Blue
    png.data[idx + 3] = 255;   // Alpha (fully opaque)
  }

  // Save the PNG to the output path
  png.pack().pipe(fs.createWriteStream(outputPath))
    .on('finish', () => console.log(`Thumbnail saved to ${outputPath}`))
    .on('error', err => console.error('Error saving thumbnail:', err));
  } catch (error) {
    console.error('Error saving thumbnail:', error);
  }
});
}

const getDicomValue = ({ dicomDataSet, key, getType = false }) => {
  const vr = dicomFields[key]?.vr.substring(0, 2);
  const bytes = dicomFields[key]?.bytes.toLowerCase();
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

      case 'OB': case 'OF': case 'OW': case 'UN': case 'OL': case 'OV':
        if (key === 'pixelData') {
          const pixelElement = dicomDataSet.elements[bytes];

          // Determine how to view the pixel data based on Bits Allocated
          const bitsAllocated = parseInt(dicomDataSet.string('x00280100')); // e.g., "8" or "16"
          // const transferSyntax = dicomDataSet.string('x00020010'); // whether its jpeg or whatever
          // console.log('transferSyntax:', transferSyntax);
          let pixelData;

          if (bitsAllocated === 16) {
            // For 16-bit pixel data, use a Uint16Array. Divide length by 2 since each pixel takes 2 bytes.
            pixelData = new Uint16Array(dicomDataSet.byteArray.buffer, pixelElement.dataOffset, pixelElement.length / 2);
          } else {
            // Otherwise, assume 8-bit pixel data
            pixelData = new Uint8Array(dicomDataSet.byteArray.buffer, pixelElement.dataOffset, pixelElement.length);
          }
          return getType ? 'BLOB' : pixelData;
        }
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

const checkDicomFile = async (filePath) => {
  let data;
  try {
    data = await fs.promises.readFile(filePath);
  } catch (err) {
    return false;
  }

  const encryptedHeader = Buffer.from([
    48, 128, 6, 9, 42, 134, 72, 134, 247, 13, 1, 7, 3,
  ]);

  // Check if encrypted
  if (data.subarray(0, 13).equals(encryptedHeader)) {
    return { filePath, isEncrypted: true, isInverted: null, metadata: [] };
  }

  // Check for DICOM prefix
  if (data.toString("utf8", 128, 132) !== "DICM") {
    return false;
  }

  try {
    // Convert Node.js Buffer to Uint8Array
    const dicomDataSet = dicomParser.parseDicom(new Uint8Array(data));
    const photometricInterpretation = getDicomValue({
      dicomDataSet,
      key: "photometricInterpretation",
    });

    const vars = Object.keys(dicomFields)
      .map((key) => ({
        title: dicomFields[key].title,
        value: getDicomValue({ dicomDataSet, key }),
        key,
      }))
      .filter((el) => el.value !== null && el.value !== undefined);

    if (!photometricInterpretation) {
      return { filePath, isEncrypted: false, isInverted: null, metadata: vars };
    }

    const isInverted = photometricInterpretation === "MONOCHROME1";
    return { filePath, isEncrypted: false, isInverted, metadata: vars };
  } catch (e) {
    console.error("Error parsing DICOM:", e);
    return false;
  }
};

ipcMain.handle('find-dicom-files', async (event, { filePath }) => {
  return findDicomFiles({ filePath });
});

const findDicomFiles = async ({ filePath }) => {
  if (filePath.isFolder) {
    const files = getAllFiles(filePath.path);
    const results = await Promise.all(files.map(checkDicomFile));
    return results.filter(result => result !== false);
  } else {
    return checkDicomFile(filePath.path).then((result) =>
      result ? [result] : []
    );
  }
};

ipcMain.handle('db-add-image', async (event, { columns }) => {
  return dbAddImage({columns});
});

const dbAddImage = ({ columns }) => {
  try {
    if (!columns?.metadata)
      console.log('no meterdater', columns);
    const validMetadata = columns.metadata.filter(x => dicomFieldsSmall[x.key]);
    // console.log('columns:', columns);
    const query = `INSERT INTO imaging (filePath, thumbPath, ${validMetadata.map(x => x.key).join(',')}) VALUES (?, ?, ${validMetadata.map(x => '?').join(', ')})`;
    let params = [columns.filePath, columns.thumbPath];
    // console.log('filePath:', columns.filePath);
    for (let i = 0; i < validMetadata.length; i++) {
      params.push(validMetadata[i].value);
    }
    const result = executeQuery({ query, params })
    // console.log(result);
    return result;
  } catch (error) {
    console.error('Database insert error:', error);
    return { success: false, error: error.message };
  } 
};

ipcMain.handle('import-files', async (event, {
  filePaths,
  firstPass,
  encryptedSet = new Set(),
  showMessage = () => {},
}) => {
  showMessage('Finding DICOM files...');

      const dicomFiles = [];
      for (let i = 0; i < filePaths.length; i++) {
        const result = await findDicomFiles({ filePath: filePaths[i] });
        if (result)
          dicomFiles.push(...result);
      }
  
  const keySet = new Set();
  if (firstPass) {
    encryptedSet = new Set();
  }
  for (let i = 0; i < dicomFiles.length; i++) {
    // console.log(dicomFiles[i]);
    showMessage(`Importing ${i + 1} of ${dicomFiles.length}...`);
    for (let j = 0; j < dicomFiles[i]?.metadata?.length; j++)
      keySet.add(dicomFiles[i].metadata[j].key);
    if (!dicomFiles[i].isEncrypted) {
      const sopInstanceUid = dicomFiles[i].metadata.filter((m) => m.key === 'sopInstanceUid')[0].value;
      const thumbPath = path.join(thumbsPath, `${sopInstanceUid}.png`);
      await saveThumbnail({ filePath: dicomFiles[i].filePath, outputPath: thumbPath });
      const newFilePath = path.join(dicomPath, `${sopInstanceUid}.dcm`);
      try {
        // console.log('Copying file:', dicomFiles[i].filePath, '->', newFilePath);
        await copyFile({ srcPath: dicomFiles[i].filePath, destPath: newFilePath });
      } catch (e) {
        // console.log('Copying file:', dicomFiles[i].filePath, '->', newFilePath);
        console.error('Error copying file:', e);
      }
      // console.log('copied file:', dicomFiles[i].filePath, '->', newFilePath);
      // console.log('adding image:', { ...dicomFiles[i], thumbPath, filePath: newFilePath });
      await dbAddImage({ columns: {...dicomFiles[i], thumbPath, filePath: newFilePath }});
    } else {
      if (firstPass)
        encryptedSet.add(dicomFiles[i].filePath);
      else
        console.error('Found encrypted file on second pass:', dicomFiles[i].filePath);
    }
  }
  console.log(keySet);
  showMessage('');
  if (encryptedSet.size > 0) {
    setShowEncryptionDialog(true);
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
