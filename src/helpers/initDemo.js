import initProviders from './initProviders.js';
import initVolumeLoader from './initVolumeLoader.js';
import { init as csRenderInit } from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import * as cornerstone from '@cornerstonejs/core';
import { init as csToolsInit } from '@cornerstonejs/tools';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';

window.cornerstone = cornerstone;
window.cornerstoneTools = cornerstoneTools;

export async function initDemo(config) {
  initProviders();
  cornerstoneDICOMImageLoader.init();
  initVolumeLoader();
  await csRenderInit({
    peerImport,
    ...(config?.core ? config.core : {}),
  });
  await csToolsInit();
}

/**
 * This is one example of how to import peer modules that works with webpack
 * It in fact just uses the default import from the browser, so it should work
 * on any standards compliant ecmascript environment.
 */
export async function peerImport(moduleId) {
  if (moduleId === 'dicom-microscopy-viewer') {
    return importGlobal(
      '/dicom-microscopy-viewer/dicomMicroscopyViewer.min.js',
      'dicomMicroscopyViewer'
    );
  }

  if (moduleId === '@icr/polyseg-wasm') {
    return import('@icr/polyseg-wasm');
  }
}

async function importGlobal(path, globalName) {
  await import(/* webpackIgnore: true */ path);
  return window[globalName];
}
