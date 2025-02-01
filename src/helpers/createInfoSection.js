function _createInfoSection(
  parentSection,
  container,
  options
) {
  const orderedList = options?.ordered;
  const info = document.createElement(orderedList ? 'ol' : 'ul');
  let lastInstructionElement = null;
  const addInstruction = (text) => {
    const instructionElement = document.createElement('li');

    instructionElement.innerText = text;
    info.appendChild(instructionElement);
    lastInstructionElement = instructionElement;

    return instructionElement;
  };

  if (parentSection === null && options?.title) {
    const title = document.createElement('p');

    title.innerText = options.title;
    container.appendChild(title);
  }

  container.appendChild(info);

  return {
    addInstruction(text) {
      addInstruction(text);
      return this;
    },
    openNestedSection(subSectionOptions) {
      if (!lastInstructionElement) {
        throw new Error('A nested section cannot be added to an empty section');
      }
      return _createInfoSection(
        this,
        lastInstructionElement,
        subSectionOptions
      );
    },
    closeNestedSection() {
      if (parentSection === null) {
        console.warn('This is already the top section');
        return this;
      }

      return parentSection;
    },
  };
}

/**
 * Create a new information section where instructions can be added to
 * @param container - HTML container element
 * @param options - Options
 * @returns An info section instance
 */
function createInfoSection(
  container,
  options
) {
  return _createInfoSection(null, container, options);
}

export { createInfoSection };
