import { utilities as csUtilities } from '@cornerstonejs/core';

import createElement from './createElement';

export default function addButtonToToolbar(config) {
  config = csUtilities.deepMerge(config, config.merge);

  config.container =
    config.container ?? document.getElementById('demo-toolbar');

  const elButton = createElement({
    merge: config,
    tag: 'button',
  });

  if (config.id) {
    elButton.id = config.id;
  }

  if (config.title) {
    elButton.innerHTML = config.title;
  }

  if (config.onClick) {
    elButton.onclick = config.onClick;
  }

  return elButton;
}
