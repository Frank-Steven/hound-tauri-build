// 日志空间组件（圆角矩形边框的区域）

import { textWidth } from '../utils/text-width.mjs';

const G = '\x1b[36m';
const N = '\x1b[39m';

const TL = '\u256D'; const TR = '\u256E';
const BL = '\u2570'; const BR = '\u256F';
const HZ = '\u2500'; const VT = '\u2502';

/** 给边框行加灰色 */
function border(s) { return G + s + N; }

function padLine(text, width) {
  const need = width - textWidth(text);
  return need > 0 ? text + ' '.repeat(need) : text;
}

export function logSpace(width, height, content) {
  if (width < 2 || height < 2) {
    // 空间不足，返回空行
    const rows = [];
    for (let y = 0; y < Math.max(0, height); y++) rows.push(' '.repeat(Math.max(0, width)));
    return rows;
  }

  const innerW = width - 2;
  const innerH = height - 2;

  const overflow = innerW < 1
    || content.some((l) => textWidth(l) > innerW)
    || content.length > innerH;
  if (overflow) {
    const rows = [];
    rows.push(border(TL + HZ.repeat(innerW) + TR));
    const msg = 'Overflow';
    const padL = Math.max(0, Math.floor((innerW - textWidth(msg)) / 2));
    for (let y = 0; y < innerH; y++) {
      if (y === Math.floor(innerH / 2)) {
        rows.push(G + VT + N + '\x1b[41m' + ' '.repeat(padL) + msg + ' '.repeat(Math.max(0, innerW - padL - textWidth(msg))) + '\x1b[0m' + G + VT + N);
      } else {
        rows.push(border(VT + ' '.repeat(innerW) + VT));
      }
    }
    rows.push(border(BL + HZ.repeat(innerW) + BR));
    return rows;
  }

  const rows = [];
  rows.push(border(TL + HZ.repeat(innerW) + TR));
  for (let y = 0; y < innerH; y++) {
    const line = y < content.length ? padLine(content[y], innerW) : ' '.repeat(innerW);
    rows.push(G + VT + N + line + G + VT + N);
  }
  rows.push(border(BL + HZ.repeat(innerW) + BR));
  return rows;
}
