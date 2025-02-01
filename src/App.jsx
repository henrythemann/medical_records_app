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

  const getViewport = () => {
    const renderingEngine = getRenderingEngine(renderingEngineId);
    return renderingEngine.getViewport(viewportId);
  };

  useEffect(() => {
    const handleResize = () => {
      const renderingEngine = getRenderingEngine(renderingEngineId);
      renderingEngine.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    }
    f();
  }, []);

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
        style={{ width: '100vw', height: '80vh', border: '1px solid black' }}
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
      />
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
        const viewport = getViewport();
        const zoom = viewport.getZoom();
        viewport.setZoom(zoom * 1.05);
        viewport.render();
      }}>
        zoom in
      </button>
      <button onClick={() => {
        const viewport = getViewport();
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