// 单行布局：将多个组件水平排列到一行，返回渲染行及每个 slot 的 x 位置

import { textWidth } from '../utils/text-width.mjs';
import { charWidth } from '../utils/char-width.mjs';

/** 按显示宽度安全截断 ANSI 文本，截断后自动补 RST */
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

/**
 * @param {Array<{ text: string, width: number }>} items
 * @param {number} totalWidth
 * @returns {{ line: string, slots: Array<{ x: number, width: number }> }}
 */
export function hLayout(items, totalWidth) {
  let line = '';
  const slots = [];
  for (const item of items) {
    const x = textWidth(line);
    if (x >= totalWidth) break; // 已满

    const avail = totalWidth - x;
    const fit = Math.min(item.width, avail);
    const clipped = fit < item.width ? truncateText(item.text, fit) : item.text;

    line += clipped;
    const actualW = textWidth(clipped);
    const pad = fit - actualW;
    if (pad > 0) line += ' '.repeat(pad);

    slots.push({ x, width: fit });
  }
  const rest = totalWidth - textWidth(line);
  if (rest > 0) line += ' '.repeat(rest);
  return { line, slots };
}
