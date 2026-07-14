// FilterBar：预设按钮（成功/警告/失败）+ 文本输入 → hLayout items

import { button } from './button.mjs';

/**
 * @param {object} state - { levels: string[], query: string }
 * @returns {Array<{ text: string, width: number }>}
 */
export function filterBar(state) {
  const items = [
    { text: button('Success', { active: state.levels.includes('success'), color: '\x1b[32m' }), width: 9 + 1 },
    { text: button('Warning', { active: state.levels.includes('warning'), color: '\x1b[33m' }), width: 9 + 1 },
    { text: button('Error',  { active: state.levels.includes('error'), color: '\x1b[31m' }),  width: 7 + 1 },
  ];
  if (state.query) {
    items.push({ text: `"${state.query}"`, width: state.query.length + 3 });
  }
  return items;
}

/** toggle a level in the state */
export function toggleLevel(state, level) {
  const idx = state.levels.indexOf(level);
  if (idx >= 0) state.levels.splice(idx, 1);
  else state.levels.push(level);
}
