// 文本宽度计算函数
/*
参数：
文本string
返回：
宽度number
*/
// 逻辑与 wrap-line 一致

import { charWidth } from './char-width.mjs';

export function textWidth(text) {
  let w = 0;

  let i = 0;
  while (i < text.length) {
    // BEL
    if (text[i] === '\x07') { i++; continue; }
    // ESC 序列
    if (text[i] === '\x1b') {
      i++;
      // OSC 序列: ESC ] ... (BEL 或 ST 终止), 零宽度
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
      continue;
    }
    w += charWidth(text[i]);
    i++;
  }

  return w;
}

/** 按视觉列切片：从 startCol（含）到 endCol（不含），保留 ANSI 序列 */
export function visSlice(str, startCol, endCol) {
  if (startCol >= endCol) return '';
  let visCol = 0;
  let i = 0;
  const n = str.length;
  let result = '';

  while (i < n) {
    if (str[i] === '\x07') { if (visCol >= startCol && visCol < endCol) result += '\x07'; i++; continue; }
    if (str[i] === '\x1b') {
      const start = i;
      i++;
      // OSC 序列: ESC ] ... (BEL 或 ST 终止), 零宽度
      if (i < n && str[i] === ']') {
        i++;
        while (i < n && str[i] !== '\x07') {
          if (str[i] === '\x1b' && i + 1 < n && str[i + 1] === '\\') { i += 2; break; }
          i++;
        }
        if (i < n && str[i] === '\x07') i++;
        if (visCol >= startCol && visCol < endCol) result += str.slice(start, i);
        continue;
      }
      if (i < n && '[P_^'.includes(str[i])) i++;
      while (i < n && (str[i] < '\x40' || str[i] > '\x7e')) i++;
      if (i < n) i++;
      if (visCol >= startCol && visCol < endCol) result += str.slice(start, i);
      continue;
    }
    const cw = charWidth(str[i]);
    if (visCol >= startCol && visCol < endCol) result += str[i];
    visCol += cw;
    i++;
  }
  return result;
}
