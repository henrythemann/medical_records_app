import { utilities } from '@cornerstonejs/core';

export default function createElement(config) {
  config = utilities.deepMerge(config, config.merge);

  const element = document.createElement(config.tag ?? 'div');

  if (config.class) {
    const splitted = config.class.split(' ');
    splitted.forEach((item) => element.classList.add(item));
  }

  if (config.attr) {
    for (const key in config.attr) {
      element.setAttribute(key, config.attr[key]);
    }
  }

  if (config.style) {
    for (const key in config.style) {
      element.style[key] = config.style[key];
    }
  }

  if (config.html) {
    element.innerHTML = config.html;
  }

  if (config.event) {
    for (const key in config.event) {
      element.addEventListener(key, config.event[key]);
    }
  }

  if (config.container) {
    config.container.append(element);
  }

  return element;
}
