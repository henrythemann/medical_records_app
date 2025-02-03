import ReactDOM from 'react-dom/client';
import React, { useEffect, useRef, useState } from 'react';
import * as styles from './styles/App.module.css';
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

  const [fullScreen, setFullScreen_] = useState(false);
  const setFullScreen = (bool) => {
    bool ? window.electronAPI.setFullScreen() : window.electronAPI.exitFullScreen();
    setFullScreen_(bool);
  };

  const getViewport = () => {
    const renderingEngine = getRenderingEngine(renderingEngineId);
    return renderingEngine.getViewport(viewportId);
  };

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
  const saverHelper = async (event) => {
    if (event.detail.viewportId === viewportId) {
      await saveViewportImage({ filePath: '/Users/waddledee72/Downloads/test.png' });
    }
    divRef.current.removeEventListener('CORNERSTONE_IMAGE_RENDERED', saverHelper);
  };


  useEffect(() => {
    const f = async () => {
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
      const viewport = renderingEngine.getViewport(viewportId);
      viewport.setStack(['wadouri:/Users/waddledee72/a.dcm']);
      divRef.current.addEventListener('CORNERSTONE_IMAGE_RENDERED', saverHelper);
    }
    f();
  }, []);

  const saveViewportImage = async ({ filePath }) => {
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
        const gray = 255 - ((value16 - minVal) / range) * 255;

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
    <div>
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
          <button
            className={styles.viewportButton}
            onClick={() => fullScreen ? setFullScreen(false) : setFullScreen(true)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <svg
              viewBox="0 0 24 24"
              width="2rem"
              height="2rem"
            >
              {fullScreen ?
                <path d="M16.79 5.8 14 3h7v7l-2.79-2.8-4.09 4.09-1.41-1.41zM19 12v4.17l2 2V12zm.78 10.61L18.17 21H5c-1.11 0-2-.9-2-2V5.83L1.39 4.22 2.8 2.81l18.38 18.38zM16.17 19l-4.88-4.88-1.59 1.59-1.41-1.41 1.59-1.59L5 7.83V19zM7.83 5H12V3H5.83z"></path> :
                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z"></path>
              }
            </svg>
          </button>
        </div>
        <div className={styles.tooltip} style={showTooltip ? { opacity: '80%' } : undefined}>
          {fullScreen ? 'Exit Full Screen' : 'Full Screen'}
        </div>
      </div>
      {!fullScreen && (
        <>
          <p>Choose a DICOM file:</p>
          <input
            type="file"
            onChange={(e) => {
              if (e.target.files?.length > 0) {
                const viewport = getViewport();
                viewport.resetCamera();
                viewport.setStack(['wadouri:' + URL.createObjectURL(e.target.files[0])]);
              }
            }}
          />
          <button onClick={() => {
            const viewport = getViewport();
            viewport.resetCamera();
            viewport.render();
          }}>
            reset view
          </button>
          <button onClick={async () => {
            const filePath = await window.electronAPI.openSaveDialog({
              defaultPath: 'image.png',
              filters: [{ name: 'PNG Image', extensions: ['png'] }],
            });

            if (!filePath) return;

            saveViewportImage({ filePath });
          }}>
            save image
          </button>
        </>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);