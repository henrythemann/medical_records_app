export const handleImportFiles = async ({
  filePaths,
  firstPass,
  encryptedSet = new Set(),
  showMessage = () => {},
}) => {
  // showMessage('Finding DICOM files...');
  
  // console.log('handleImportFiles', { filePaths, firstPass, encryptedSet });
  // const dicomFiles = await window.electronAPI.findDicomFiles({ filePaths });
  // console.log('dicomFiles', dicomFiles);
  // const thumbsPath = await window.electronAPI.getThumbsPath();
  // const dicomPath = await window.electronAPI.getDicomPath();
  // const keySet = new Set();
  // if (firstPass) {
  //   encryptedSet = new Set();
  // }
  // for (let i = 0; i < dicomFiles.length; i++) {
  //   console.log(dicomFiles[i]);
  //   showMessage(`Importing ${i + 1} of ${dicomFiles.length}...`);
  //   for (let j = 0; j < dicomFiles[i]?.metadata?.length; j++)
  //     keySet.add(dicomFiles[i].metadata[j].key);
  //   if (!dicomFiles[i].isEncrypted) {
  //     const sopInstanceUid = dicomFiles[i].metadata.filter((m) => m.key === 'sopInstanceUid')[0].value;
  //     const thumbPath = await window.electronAPI.joinPaths([thumbsPath, `${sopInstanceUid}.png`]);
  //     // await window.electronAPI.saveThumbnail({ filePath: dicomFiles[i].filePath, outputPath: thumbPath });
  //     const newFilePath = await window.electronAPI.joinPaths([dicomPath, `${sopInstanceUid}.dcm`]);
  //     try {
  //       console.log('Copying file:', dicomFiles[i].filePath, '->', newFilePath);
  //       await window.electronAPI.copyFile({ srcPath: dicomFiles[i].filePath, destPath: newFilePath });
  //     } catch (e) {
  //       console.log('Copying file:', dicomFiles[i].filePath, '->', newFilePath);
  //       console.error('Error copying file:', e);
  //     }
  //     console.log('copied file:', dicomFiles[i].filePath, '->', newFilePath);
  //     console.log('adding image:', { ...dicomFiles[i], thumbPath, filePath: newFilePath });
  //     await window.electronAPI.dbAddImage({ ...dicomFiles[i], thumbPath, filePath: newFilePath });
  //   } else {
  //     if (firstPass)
  //       encryptedSet.add(dicomFiles[i].filePath);
  //     else
  //       console.error('Found encrypted file on second pass:', dicomFiles[i].filePath);
  //   }
  // }
  // console.log(keySet);
  // showMessage('');
  // if (encryptedSet.size > 0) {
  //   setShowEncryptionDialog(true);
  // }
};