import addLabelToToolbar from './addLabelToToolbar';

export default function addCheckboxToToolbar(config) {
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
  const fnChange = (evt) => {
    const elInput = evt.target;

    if (config.onChange) {
      config.onChange(elInput.checked);
    }
  };

  //
  const elInput = createElement({
    merge: config,
    tag: 'input',
    attr: {
      type: 'checkbox',
      name: config.title,
      checked: !!config.checked,
    },
    event: {
      change: fnChange,
    },
  });

  if (config.id) {
    elInput.id = config.id;
  }
}
