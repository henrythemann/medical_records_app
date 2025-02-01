import { segmentation } from '@cornerstonejs/tools';

import addDropDownToToolbar from './addDropdownToToolbar';

/**
 * Ceate a segment index selector dropdown
 *
 */
const addSegmentIndexDropdown = (
  segmentationId,
  segmentIndices = [1, 2, 3, 4, 5]
) => {
  addSegmentIndexDropdown.segmentationId = segmentationId;
  addSegmentIndexDropdown.segmentIndex = segmentIndices[0];
  addDropDownToToolbar({
    labelText: 'Segment Index',
    options: { values: segmentIndices, defaultValue: segmentIndices[0] },
    onSelectedValueChange: (nameAsStringOrNumber) => {
      addSegmentIndexDropdown.updateActiveSegmentIndex(
        Number(nameAsStringOrNumber)
      );
    },
  });
};

addSegmentIndexDropdown.updateActiveSegmentIndex = (segmentIndex) => {
  addSegmentIndexDropdown.segmentIndex = segmentIndex;
  const { segmentationId } = addSegmentIndexDropdown;
  segmentation.segmentIndex.setActiveSegmentIndex(segmentationId, segmentIndex);
};

export default addSegmentIndexDropdown;
