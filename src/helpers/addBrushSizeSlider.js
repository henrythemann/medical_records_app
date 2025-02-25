import { utilities as csUtilities } from '@cornerstonejs/tools';

import addSliderToToolbar from './addSliderToToolbar';

/**
 * Adds a slider to control brush size to the example page.
 */
export default function addBrushSizeSlider(config) {
  if (!config.toolGroupId) {
    config.toolGroupId = 'TOOL_GROUP_ID';
  }

  //
  addSliderToToolbar({
    merge: config,
    title: 'Brush Size: ',
    range: [5, 50],
    defaultValue: 25,
    onSelectedValueChange: (valueAsStringOrNumber) => {
      const value = Number(valueAsStringOrNumber);

      csUtilities.segmentation.setBrushSizeForToolGroup(
        config.toolGroupId,
        value
      );
    },
  });
}
