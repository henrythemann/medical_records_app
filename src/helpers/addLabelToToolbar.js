import { utilities as csUtilities } from '@cornerstonejs/core';

export default function addLabelToToolbar(
  config
) {
  config = csUtilities.deepMerge(config, config.merge || {});

  config.container =
    config.container ?? document.getElementById('demo-toolbar');

  const elLabel = createElement({
    merge: config,
    tag: 'label',
  });

  if (config.id) {
    elLabel.id = config.id;
  }

  if (config.title) {
    elLabel.innerHTML = config.title;
  }

  return elLabel;
}
