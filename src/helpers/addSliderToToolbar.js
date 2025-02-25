import { utilities as csUtilities } from '@cornerstonejs/core';

import createElement from './createElement';
import addLabelToToolbar from './addLabelToToolbar';

export default function addSliderToToolbar(config) {
  config = csUtilities.deepMerge(config, config.merge);

  config.container =
    config.container ?? document.getElementById('demo-toolbar');

  //
  const elLabel = addLabelToToolbar({
    merge: config.label,
    title: config.title,
    container: config.container,
  });

  if (config.id) {
    elLabel.id = `${config.id}-label`;
  }

  elLabel.htmlFor = config.title;

  //
  const fnInput = (evt) => {
    const selectElement = evt.target;

    if (selectElement) {
      config.onSelectedValueChange(selectElement.value);

      if (config.updateLabelOnChange !== undefined) {
        config.updateLabelOnChange(selectElement.value, elLabel);
      }
    }
  };

  //
  const elInput = createElement({
    merge: config,
    tag: 'input',
    attr: {
      type: 'range',
      name: config.title,
    },
    event: {
      input: fnInput,
    },
  });

  if (config.id) {
    elInput.id = config.id;
  }

  // Add step before setting its value to make sure it works for step different than 1.
  // Example: range (0-1), step (0.1) and value (0.5)
  if (config.step) {
    elInput.step = String(config.step);
  }

  elInput.min = String(config.range[0]);
  elInput.max = String(config.range[1]);

  elInput.value = String(config.defaultValue);

  return () => {
    elLabel.remove();
    elInput.remove();
  };
}
