import ReactDOM from 'react-dom/client';
import React, { useEffect, useRef, useState } from 'react';
import * as styles from './styles/App.module.scss';
import {
  getRenderingEngine,
  RenderingEngine,
  Enums,
} from '@cornerstonejs/core';
import {
  initDemo,
} from '@/helpers';

const { ViewportType } = Enums;
const renderingEngineId = 'myRenderingEngine';
const viewportId = 'CT_STACK';

const App = () => {
  const divRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [menuX, setMenuX] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [showEncryptionDialog, setShowEncryptionDialog] = useState(false);
  const [encryptionDialogMessage, setEncryptionDialogMessage] = useState('Found some files that were encrypted. Please enter the password:');
  const decryptionPassword = useRef(null);
  const encryptedSet = useRef(new Set());

  const [fullScreen, setFullScreen_] = useState(false);
  const setFullScreen = (bool) => {
    bool ? window.electronAPI.setFullScreen() : window.electronAPI.exitFullScreen();
    setFullScreen_(bool);
  };

  const getViewport = () => {
    const renderingEngine = getRenderingEngine(renderingEngineId);
    return renderingEngine.getViewport(viewportId);
  };
  const handleDecrypt = async () => {
    // BUG: potential issue if some files successfully decrypt and others don't
    setShowEncryptionDialog(false);
    try {
      await decrypt({ fileSet: encryptedSet.current, key: decryptionPassword.current.value });
      await handleImportFiles({ filePaths: Array.from(encryptedSet.current), firstPass: false });

    } catch (e) {
      console.error('Error decrypting files:', e);
      decryptionPassword.current.value = '';
      setEncryptionDialogMessage('Unable to decrypt (decryption has only been tested with files encrypted by DCSView). Please try again:');
      setShowEncryptionDialog(true);
    }
  };

  const handleImportFiles = async ({ filePaths, firstPass }) => {
    setModalMessage('Finding DICOM files...');
    setShowTooltip(false);
    const johnsons = await window.electronAPI.findDicomFiles({ filePaths });
    console.log(johnsons[0])
    const thumbsPath = await window.electronAPI.getThumbsPath();
    const keySet = new Set();
    if (firstPass) {
      encryptedSet.current = new Set();
    }
    for (let i = 0; i < johnsons.length; i++) {
      setModalMessage(`Importing ${i + 1} of ${johnsons.length}...`);
      for (let j = 0; j < johnsons[i]?.metadata?.length; j++)
        keySet.add(johnsons[i].metadata[j].key);
      if (!johnsons[i].isEncrypted) {
        const newPath = await window.electronAPI.joinPaths([thumbsPath, `image${i}.png`]);
        await saveFile({ filePath: johnsons[i].filePath, invert: johnsons[i].isInverted, outputPath: newPath });
        // await window.electronAPI.dbQuery({ query: `INSERT INTO imaging (path, hospital_name) VALUES ('${newPath}', '${johnsons[i].hospitalName}')` });
      } else {
        if (firstPass)
          encryptedSet.current.add(johnsons[i].filePath);
        else
          console.error('Found encrypted file on second pass:', johnsons[i].filePath);
      }
    }
    console.log(keySet);
    setModalMessage('');
    if (encryptedSet.current.size > 0) {
      setShowEncryptionDialog(true);
    }
  };

  const decrypt = async ({ fileSet, key }) => {
    for (const inFilePath of fileSet) {
      await window.electronAPI.decryptFile({ inFilePath, outFilePath: inFilePath + '_decrypt', key: decryptionPassword.current.value });
    }
  }
  useEffect(() => {
    if (showEncryptionDialog) {
      decryptionPassword.current.focus();
    }
  }, [showEncryptionDialog]);

  useEffect(() => {
    const handleResize = () => {
      const renderingEngine = getRenderingEngine(renderingEngineId);
      renderingEngine.resize();
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setFullScreen(false);
      } else if (e.metaKey && (e.key === '=' || e.key === '-')) {
        e.preventDefault();
        const viewport = getViewport();
        let currentZoom = viewport.getZoom();
        if (e.key === '=')
          viewport.setZoom(currentZoom * 1.1);
        else
          viewport.setZoom(currentZoom / 1.1);
        viewport.render();
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const f = async () => {
      await window.electronAPI.init();
      // Init Cornerstone and related libraries
      await initDemo();
      const renderingEngine = new RenderingEngine(renderingEngineId);
      const viewportInput = {
        viewportId,
        type: ViewportType.STACK,
        element: divRef.current,
        defaultOptions: {
          background: [0.1, 0.1, 0.1],
        },
      };
      renderingEngine.enableElement(viewportInput);

    }
    f();
  }, []);

  const saveFile = async ({ filePath, outputPath, invert }) => {
    const viewport = getViewport();
    const saveFileHelper = async (event) => {
      if (event.detail.viewportId === viewportId) {
        await saveViewportImage({ filePath: outputPath, invert });
      }
    };
    divRef.current.addEventListener(
      'CORNERSTONE_IMAGE_RENDERED',
      saveFileHelper,
      { once: true }
    );
    await viewport.setStack(['wadouri:' + filePath]);
  };

  const saveViewportImage = async ({ filePath, invert }) => {
    try {
      const viewport = getViewport();
      // This is a vtkImageData
      const vtkImage = viewport.getImageData();

      if (!vtkImage || !vtkImage.dimensions || !vtkImage.scalarData) {
        console.error('No image data found');
        return;
      }
      // 1. Extract dimensions and pixel data
      const [width, height] = vtkImage.dimensions;
      const scalarData = vtkImage.scalarData;

      // 2. Create a new offscreen canvas at exactly the image size
      let offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const ctx = offscreen.getContext('2d');

      // 3. Convert the raw pixel data into RGBA for the canvas
      //    (Assume grayscale for demonstration; for color images, 
      //     you’d map pixelData differently.)
      const imageData = ctx.createImageData(width, height);

      let minVal = Infinity;
      let maxVal = -Infinity;
      for (let i = 0; i < scalarData.length; i++) {
        const v = scalarData[i];
        if (v < minVal) {
          minVal = v;
        }
        if (v > maxVal) {
          maxVal = v;
        }
      }
      const range = maxVal - minVal || 1;

      // 4. Loop over every pixel, scale to [0..255]
      for (let i = 0; i < width * height; i++) {
        // Read the raw 16-bit intensity
        const value16 = scalarData[i];

        // Scale from [minVal..maxVal] to [0..255]
        let gray = ((value16 - minVal) / range) * 255;
        if (invert)
          gray = 255 - gray;

        // Write into the Canvas ImageData (RGB + alpha)
        const idx = i * 4;
        imageData.data[idx + 0] = gray;    // R
        imageData.data[idx + 1] = gray;    // G
        imageData.data[idx + 2] = gray;    // B
        imageData.data[idx + 3] = 0xff;    // alpha = fully opaque
      }
      ctx.putImageData(imageData, 0, 0);

      // 4. Export just that “pure” image region (no extra canvas space)
      const dataUrl = offscreen.toDataURL();

      // 5. Convert dataURL -> buffer and send to Electron
      // const buffer = dataURItoBlob(dataUrl);
      const result = await window.electronAPI.saveViewportImage({ filePath, content: dataUrl });
      if (!result?.success)
        console.error('Error saving image:', result.error);

      // cleanup
      URL.revokeObjectURL(dataUrl);
      offscreen = null;
    } catch (error) {
      console.error('Error saving image:', error);
    }
  }

  const handleMouseDrag = (event) => {
    const deltaX = event.clientX - mouseStartCoords.current.x + panStartCoords.current.x;
    const deltaY = event.clientY - mouseStartCoords.current.y + panStartCoords.current.y;
    const viewport = getViewport();
    viewport.setPan([deltaX, deltaY]);
    viewport.render();
  };

  const handleWheelZoom = (event) => {
    const viewport = getViewport();
    const zoomFactor = 1.05; // Scale factor for zooming
    let currentZoom = viewport.getZoom();

    if (event.deltaY < 0) {
      // Zoom in
      viewport.setZoom(currentZoom * zoomFactor);
    } else {
      // Zoom out
      viewport.setZoom(currentZoom / zoomFactor);
    }
    viewport.render();
  };

  const mouseStartCoords = useRef({ x: 0, y: 0 });
  const panStartCoords = useRef({ x: 0, y: 0 });

  return (
    <div className={styles.noOverflow}>
      {modalMessage &&
        <div id='modal-overlay' className={styles.modalOverlay} >
          <div id='modal' className={styles.modal}>
            <p>{modalMessage}</p>
          </div>
        </div>
      }
      <div
        id='modal-overlay'
        className={styles.modalOverlay}
        style={showEncryptionDialog ? null : { display: 'none', pointerEvents: 'none' }}
      >
        <div id='modal' className={styles.modal} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '0.75rem 2rem',
          maxWidth: '30rem',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            top: '0.5rem',
            right: '0.5rem',
            width: '0.5rem',
            height: '0.5rem',
          }}>
            <button onClick={() => setShowEncryptionDialog(false)}>&#215;</button>
          </div>
          <span>{encryptionDialogMessage}</span>
          <input ref={decryptionPassword} onKeyDown={(e) => {
            if (e.key === 'Enter') handleDecrypt();
          }} type='password' />
          <button style={{ padding: '0.25rem 1rem' }} onClick={handleDecrypt}>Decrypt</button>
        </div>
      </div>
      <div
        id='cornerstone-element'
        ref={divRef}
        style={{
          width: 'calc(100vw - 2px)',
          height: fullScreen ? 'calc(100vh - 2px)' : '80vh',
          border: '1px solid black',
          position: 'relative',
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          mouseStartCoords.current = { x: e.clientX, y: e.clientY };
          const viewport = getViewport();
          const pan = viewport.getPan();
          panStartCoords.current = { x: pan[0], y: pan[1] };
        }}
        onMouseMove={(e) => {
          if (e.buttons === 1) {
            handleMouseDrag(e, mouseStartCoords.current.x, mouseStartCoords.current.y);
          }
        }}
        onWheel={handleWheelZoom}
      >
        <div id='viewport-buttons' style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          zIndex: 10,
        }}
        >
          <div style={{
            position: 'relative',
          }}
          >
            <button
              className={[styles.viewportButton, showTooltip ? styles.menuX : ''].join(' ')}
              onClick={() => {
                setShowTooltip(!showTooltip)
                setMenuX(!menuX)
              }}
            >
              <div className={styles.hamburger} >
                <div className={styles.bar} />
                <div className={styles.bar} />
                <div className={styles.bar} />
              </div>
            </button>
            <div className={styles.tooltip} style={showTooltip ? { opacity: '80%' } : { pointerEvents: 'none' }}>
              <ul>
                <li>
                  <button onClick={() => {
                    fullScreen ? setFullScreen(false) : setFullScreen(true)
                    setShowTooltip(false);
                  }}>
                    fullscreen
                  </button>
                </li>
                <li>
                  <button onClick={() => {
                    const viewport = getViewport();
                    viewport.resetCamera();
                    viewport.render();
                    setShowTooltip(false);
                  }}>
                    reset view
                  </button>
                </li>
                <li>
                  <button onClick={async () => {
                    const filePath = await window.electronAPI.openSaveDialog({
                      defaultPath: 'image.png',
                      filters: [{ name: 'PNG Image', extensions: ['png'] }],
                    });

                    if (!filePath) return;

                    saveViewportImage({ filePath });
                    setShowTooltip(false);
                  }}>
                    save image
                  </button>
                </li>
                <li>
                  <button onClick={async () => {
                    const filePaths = await window.electronAPI.openFileDialog({
                      filters: [{ name: 'All Files', extensions: ['*'] }],
                    });
                    if (!filePaths) return;
                    await handleImportFiles({ filePaths, firstPass: true });
                  }}
                  >
                    import images...
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      {!fullScreen && (
        <>
          <p>Choose a DICOM file:</p>
          <input
            type="file"
            onChange={async (e) => {
              if (e.target.files?.length > 0) {
                const viewport = getViewport();
                viewport.resetCamera();
                await viewport.setStack(['wadouri:' + URL.createObjectURL(e.target.files[0])])
              }
            }}
          />
        </>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);