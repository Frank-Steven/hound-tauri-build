// 文本组件：带样式的文本渲染

import { textWidth } from '../utils/text-width.mjs';
import { charWidth } from '../utils/char-width.mjs';

/** 按显示宽度安全截断（不切 ANSI 码），截断后自动补 RST */
function truncateText(text, maxVisual) {
  let w = 0;
  let i = 0;
  let hasSGR = false;
  while (i < text.length) {
    if (text[i] === '\x07') { i++; continue; }
    if (text[i] === '\x1b') {
      const escStart = i;
      i++;
      // OSC 序列: ESC ] ... (BEL 或 ST 终止)
      if (text[i] === ']') {
        i++;
        while (i < text.length && text[i] !== '\x07') {
          if (text[i] === '\x1b' && i + 1 < text.length && text[i + 1] === '\\') { i += 2; break; }
          i++;
        }
        if (i < text.length && text[i] === '\x07') i++;
        continue;
      }
      if ('[P_^'.includes(text[i])) i++;
      while (i < text.length && (text[i] < '\x40' || text[i] > '\x7e')) i++;
      if (i < text.length) i++;
      if (text.slice(escStart, i).match(/\x1b\[[\d;]*m/)) hasSGR = true;
      continue;
    }
    const cw = charWidth(text[i]);
    if (w + cw > maxVisual) break;
    w += cw;
    i++;
  }
  const truncated = text.slice(0, i);
  if (i < text.length && hasSGR) return truncated + '\x1b[0m';
  return truncated;
}

const RST = '\x1b[39;22;24m';  // 只重置前景色+粗细+下划线，保留背景
const STYLES = {
  bold: '\x1b[1m',
  underline: '\x1b[4m',
  dim: '\x1b[2m',
};

const COLORS = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
  white: '\x1b[37m', gray: '\x1b[90m',
};

/**
 * @param {string} content
 * @param {{ width?: number, color?: string, bold?: boolean, underline?: boolean, dim?: boolean }} [opts]
 * @returns {string}
 */
export function text(content, opts = {}) {
  let s = '';

  if (opts.color && COLORS[opts.color]) s += COLORS[opts.color];
  if (opts.bold) s += STYLES.bold;
  if (opts.underline) s += STYLES.underline;
  if (opts.dim) s += STYLES.dim;

  s += content;

  if (s !== content) s += RST;

  if (opts.width != null) {
    const need = opts.width - textWidth(content);
    if (need > 0) s += ' '.repeat(need);
    else if (need < 0) s = truncateText(s, opts.width);
  }

  return s;
}
