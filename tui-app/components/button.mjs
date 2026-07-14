// 按钮组件：[ Label ] 格式，支持 active/inactive 样式

import { textWidth } from '../utils/text-width.mjs';

const RST = '\x1b[0m';
const DIM = '\x1b[2m';

/**
 * @param {string} label
 * @param {{ active?: boolean, width?: number, color?: string }} [opts]
 * @returns {string}
 */
export function button(label, opts = {}) {
  const active = opts.active !== false;
  const inner = `[${label}]`;
  let s = '';

  if (opts.color && !active) {
    s += DIM;
  } else if (opts.color) {
    s += opts.color;
  } else if (!active) {
    s += DIM;
  }

  s += inner;
  if (!active || opts.color) s += RST;

  if (opts.width != null) {
    const need = opts.width - textWidth(inner);
    if (need > 0) s += ' '.repeat(need);
  }

  return s;
}
