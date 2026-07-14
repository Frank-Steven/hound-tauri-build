// Scroll 交互：键盘/滚轮驱动 maxIndex

import { on, off } from '../utils/events.mjs';

/**
 * @param {object} state - { maxIndex, contentLength, viewHeight } will be mutated
 * @param {() => void} redraw - called after scroll change
 * @param {() => boolean} [isDisabled] - when returns true, scroll is ignored
 * @returns {() => void} cleanup function
 */
export function bindScroll(state, redraw, isDisabled) {
  function up() {
    if (state.maxIndex > 0) {
      state.maxIndex--;
      redraw();
    }
  }
  function down() {
    if (state.maxIndex < state.contentLength - 1) {
      state.maxIndex++;
      redraw();
    }
  }
  function pageUp() {
    const step = Math.max(1, state.viewHeight - 1);
    state.maxIndex = Math.max(0, state.maxIndex - step);
    redraw();
  }
  function pageDown() {
    const step = Math.max(1, state.viewHeight - 1);
    state.maxIndex = Math.min(state.contentLength - 1, state.maxIndex + step);
    redraw();
  }

  const onKey = (k) => {
    if (isDisabled && isDisabled()) return;
    switch (k.name) {
      case 'up': up(); break;
      case 'down': down(); break;
      case 'pageup': pageUp(); break;
      case 'pagedown': pageDown(); break;
      case 'home': state.maxIndex = 0; redraw(); break;
      case 'end': state.maxIndex = state.contentLength - 1; redraw(); break;
    }
  };

  const onScroll = (e) => {
    if (isDisabled && isDisabled()) return;
    if (e.dir === 'up') up();
    else down();
  };

  on('key', onKey);
  on('scroll', onScroll);

  return () => {
    off('key', onKey);
    off('scroll', onScroll);
  };
}
