import createElement from './createElement';
import addButtonToToolbar from './addButtonToToolbar';

export default function addUploadToToolbar(config) {
  config.container =
    config.container ?? document.getElementById('demo-toolbar');

  //
  const fnClick = () => {
    //
    const elInput = createElement({
      merge: config.input,
      tag: 'input',
      attr: {
        type: 'file',
        multiple: true,
        hidden: true,
      },
      event: {
        change: (evt) => {
          const files = (evt.target).files;

          config.onChange(files);

          elInput.remove();
        },
        cancel: () => {
          elInput.remove();
        },
      },
    });

    document.body.appendChild(elInput);

    elInput.click();
  };

  //
  addButtonToToolbar({
    merge: config,
    title: config.title,
    onClick: fnClick,
  });
}
