import ReactDOM from 'react-dom/client';
import React, { useEffect, useRef, useState } from 'react';
import styles from '@/styles/App.module.css';
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
  const [file, setFile] = useState(null);

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  useEffect(() => {
    const f = async () => {
      // Init Cornerstone and related libraries
      await initDemo();
    }
    f();
  }, []);

  const handleMouseDrag = (moveEvent) => {
    const deltaX = moveEvent.clientX - mouseStartCoords.current.x + panStartCoords.current.x;
    const deltaY = moveEvent.clientY - mouseStartCoords.current.y + panStartCoords.current.y;
    const renderingEngine = getRenderingEngine(renderingEngineId);
    const viewport = renderingEngine.getViewport(viewportId);
    viewport.setPan([deltaX, deltaY]);
    viewport.render();
  };

  const mouseStartCoords = useRef({ x: 0, y: 0 });
  const panStartCoords = useRef({ x: 0, y: 0 });

  return (
    <div>
      <div
        id='cornerstone-element'
        ref={divRef}
        style={{ width: '512px', height: '512px', border: '1px solid black' }}
        onMouseDown={(e) => {
          e.preventDefault();
          mouseStartCoords.current = { x: e.clientX, y: e.clientY };
          const renderingEngine = getRenderingEngine(renderingEngineId);
          const viewport = renderingEngine.getViewport(viewportId);
          const pan = viewport.getPan();
          panStartCoords.current = { x: pan[0], y: pan[1] };
        }}
        onMouseMove={(e) => {
          if (e.buttons === 1) {
            handleMouseDrag(e, mouseStartCoords.current.x, mouseStartCoords.current.y);
          }
        }}
      />
      <p>Choose a DICOM file: {file?.name ?? ''}</p>
      <input
        type="file"
        onChange={(e) => {
          if (e.target.files?.length > 0) {
            console.log('file:', e);
            // setFile(e.target.files[0]);
            const renderingEngine = new RenderingEngine(renderingEngineId);

            // Create a stack viewport
            const viewportInput = {
              viewportId,
              type: ViewportType.STACK,
              element: divRef.current,
              defaultOptions: {
                background: [0.2, 0, 0.2],
              },
            };

            renderingEngine.enableElement(viewportInput);

            // Get the stack viewport that was created
            const viewport = renderingEngine.getViewport(
              viewportId
            );
            viewport.setStack(['wadouri:' + URL.createObjectURL(e.target.files[0])]);
          }
        }}
      />
      <button onClick={() => {
        const renderingEngine = getRenderingEngine(renderingEngineId);
        const viewport = renderingEngine.getViewport(
          viewportId
        );

        viewport.resetCamera({
          resetZoom: true,
          resetPan: false,
          resetToCenter: false,
        });
        viewport.render();
      }}>
        reset zoom
      </button>
      <button onClick={() => {
        const renderingEngine = getRenderingEngine(renderingEngineId);
        const viewport = renderingEngine.getViewport(
          viewportId
        );

        const zoom = viewport.getZoom();

        viewport.setZoom(zoom * 1.05);
        viewport.render();
      }}>
        zoom in
      </button>
      <button onClick={() => {
        const renderingEngine = getRenderingEngine(renderingEngineId);

        // Get the stack viewport
        const viewport = renderingEngine.getViewport(
          viewportId
        );
        viewport.resetCamera();
        viewport.render();
      }}>
        reset
      </button>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);