import { charWidth } from './char-width.mjs';

export function wrapLine(text, width) {
/*
文本换行函数
@param {string} text - 待换行的文本
@param {number} width - 换行宽度
@returns {[string]} - 换行后的文本
字符串包含转义字符，全角字符，中文字符，
ANSI/CSI/OSC/BEL/ST/DCS/PM/APC控制符等，
需要特殊处理
*/

  const lines = [];
  let cur = '';
  let curW = 0;
  let i = 0;
  let sgr = '';

  function pad() {
    const need = width - curW;
    if (need > 0) cur += ' '.repeat(need);
    curW = width;
  }

  function breakLine() {
    if (sgr) cur += '\x1b[0m';
    pad();
    lines.push(cur);
    cur = sgr;
    curW = 0;
  }

  while (i < text.length) {
    // BEL
    if (text[i] === '\x07') { cur += '\x07'; i++; continue; }

    // ESC 序列
    if (text[i] === '\x1b') {
      const start = i;
      i++;
      // OSC 序列: ESC ] ... (BEL 或 ST 终止), 零宽度，直通输出
      if (text[i] === ']') {
        i++;
        while (i < text.length && text[i] !== '\x07') {
          if (text[i] === '\x1b' && i + 1 < text.length && text[i + 1] === '\\') { i += 2; break; }
          i++;
        }
        if (i < text.length && text[i] === '\x07') i++; // consume BEL
        cur += text.slice(start, i);
        continue;
      }
      if ('[P_^'.includes(text[i])) i++;
      while (i < text.length && (text[i] < '\x40' || text[i] > '\x7e')) i++;
      if (i < text.length) i++;
      const seq = text.slice(start, i);
      // SGR 序列追踪活跃样式
      if (/^\x1b\[\d*(;\d+)*m$/.test(seq)) {
        sgr = (seq === '\x1b[0m' || seq === '\x1b[m') ? '' : seq;
        cur += seq;
      }
      continue;
    }

    const c = text[i];
    const w = charWidth(c);

    if (curW + w > width) {
      if (curW > 0) breakLine();
      // 单个字符宽度超过行长，强制放置
    }

    cur += c;
    curW += w;
    i++;
  }

  if (cur.length > 0) {
    pad();
    lines.push(cur);
  }

  return lines;
}
