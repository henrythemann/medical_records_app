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
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return { buffer: ab, type: mimeString };
  }

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
      document.getElementById('cornerstone-element').addEventListener('CORNERSTONE_IMAGE_RENDERED', async (event) => {
        if (event.detail.viewportId === viewportId) {
            console.log('Image fully rendered, saving now...');
            await saveImageFile();
        }
    });
    }
    f();
  }, []);

  const saveImageFile = async () => {
    const viewport = getViewport();
    const canvas = viewport.getCanvas();
    const imageData = viewport.getImageData();
    console.log(imageData);
    // const imageWidth = imageData.width;
    // const imageHeight = imageData.height;
    const { buffer, type } = dataURItoBlob(canvas.toDataURL());
    const result = await window.electronAPI.saveFile('test.png', buffer);
    console.log(result);
  };

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
          height: '80vh',
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
      </div>
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
        saveImageFile();
      }}>
        save file
      </button>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);