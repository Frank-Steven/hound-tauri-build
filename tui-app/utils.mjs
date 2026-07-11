/**
 * @file TUI 工具函数
 */

import { ANSI_RE, OSC_RE, ERROR_RE, DEPRECATION_RE, RETRY_RE } from './constants.mjs';

// ============================================================
//  错误检测
// ============================================================

export function isErrorLine(line) {
  const stripped = stripAnsi(line);
  if (DEPRECATION_RE.test(stripped)) return false;
  if (stripped.includes('Skipped')) return false;
  if (RETRY_RE.test(stripped)) return false;
  return ERROR_RE.test(stripped);
}

// ============================================================
//  ANSI / 文本处理
// ============================================================

export function parseBullet(line) {
  const m = line.match(/^(\x1b\[(\d+)m\u25cf\x1b\[0m) /);
  if (!m) return null;
  return { color: m[2], bullet: m[1] + ' ', rest: line.slice(m[0].length) };
}

export function stripAnsi(str) {
  return str.replace(OSC_RE, '').replace(ANSI_RE, '');
}

export function isWideChar(cp) {
  return (cp >= 0x1100 && cp <= 0x115F)
      || (cp >= 0x2E80 && cp <= 0xA4CF)
      || (cp >= 0xAC00 && cp <= 0xD7A3)
      || (cp >= 0xF900 && cp <= 0xFAFF)
      || (cp >= 0xFE10 && cp <= 0xFE19)
      || (cp >= 0xFE30 && cp <= 0xFE6F)
      || (cp >= 0xFF01 && cp <= 0xFF60)
      || (cp >= 0xFFE0 && cp <= 0xFFE6)
      || (cp >= 0x1F300 && cp <= 0x1F64F)
      || (cp >= 0x1F900 && cp <= 0x1F9FF)
      || (cp >= 0x20000 && cp <= 0x2FFFD)
      || (cp >= 0x30000 && cp <= 0x3FFFD);
}

export function visualWidth(str) {
  let w = 0;
  for (const ch of str) {
    w += isWideChar(ch.codePointAt(0)) ? 2 : 1;
  }
  return w;
}

export function truncateToWidth(str, maxWidth) {
  if (maxWidth <= 0) return '';
  const segments = [];
  let lastEnd = 0;
  let match;
  ANSI_RE.lastIndex = 0;
  while ((match = ANSI_RE.exec(str)) !== null) {
    if (match.index > lastEnd) {
      segments.push({ ansi: false, text: str.slice(lastEnd, match.index) });
    }
    segments.push({ ansi: true, text: match[0] });
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd < str.length) {
    segments.push({ ansi: false, text: str.slice(lastEnd) });
  }
  if (segments.length === 0) return '';
  let totalWidth = 0;
  for (const seg of segments) {
    if (!seg.ansi) totalWidth += visualWidth(seg.text);
  }
  if (totalWidth <= maxWidth) return str;
  let result = '';
  let w = 0;
  for (const seg of segments) {
    if (seg.ansi) {
      result += seg.text;
      continue;
    }
    for (const ch of seg.text) {
      const cw = isWideChar(ch.codePointAt(0)) ? 2 : 1;
      if (w + cw > maxWidth - 1) {
        return result + '\x1b[0m\u2026';
      }
      w += cw;
      result += ch;
    }
  }
  return result + '\u2026';
}

export function takeVisualChars(str, maxW) {
  const chars = [...str];
  let w = 0;
  let i = 0;
  for (; i < chars.length; i++) {
    const cw = isWideChar(chars[i].codePointAt(0)) ? 2 : 1;
    if (w + cw > maxW) break;
    w += cw;
  }
  return { line: chars.slice(0, i).join(''), rest: chars.slice(i).join('') };
}

export function wrapLine(str, maxWidth, indentWidth = 2) {
  const bulletMatch = str.match(/^(\x1b\[\d+m\u25cf\x1b\[0m) /);
  let content;
  let bulletPrefix = '';
  if (bulletMatch) {
    bulletPrefix = bulletMatch[1] + ' ';
    content = str.slice(bulletMatch[0].length);
  } else {
    content = str;
  }
  const firstWidth = bulletMatch ? maxWidth - 2 : maxWidth;
  const contWidth = maxWidth - indentWidth;
  const indent = ' '.repeat(indentWidth);
  const lines = [];
  const { line: firstLine, rest: afterFirst } = takeVisualChars(content, firstWidth);
  lines.push(bulletPrefix + firstLine);
  let remaining = afterFirst;
  while (remaining.length > 0) {
    const trimmed = remaining.replace(/^\s+/, '');
    if (trimmed.length === 0) break;
    const { line, rest } = takeVisualChars(trimmed, contWidth);
    lines.push(indent + line);
    remaining = rest;
  }
  return lines;
}

// ============================================================
//  文本选择
// ============================================================

export function getPrefixSkip(plain) {
  if (plain.startsWith('\u25cf ')) return 2;
  if (/^  [^ \u2014]/.test(plain)) return 2;
  return 0;
}

/**
 * 将一行文本按照高亮范围拆分为三段（before / selected / after）。
 * 选中段（selected）剥离了原始 ANSI 码，避免干扰 Ink 的 backgroundColor / color 样式。
 * 非选中段保留原始 ANSI 码以维持原有着色。
 *
 * @param {string} line  原始行（可能含 ANSI 码）
 * @param {number} startCol  选中起始视觉列
 * @param {number} endCol    选中结束视觉列
 * @returns {{ before: string, selected: string, after: string }|null}
 */
export function splitLineForHighlight(line, startCol, endCol) {
  const plain = stripAnsi(line);
  const prefixSkip = getPrefixSkip(plain);
  startCol = Math.max(startCol, prefixSkip);
  if (startCol >= endCol) return null;
  const totalWidth = visualWidth(plain);
  if (startCol >= totalWidth) return null;
  const effEnd = endCol === Infinity || !isFinite(endCol) ? totalWidth : Math.min(endCol, totalWidth);
  if (startCol >= effEnd) return null;

  // 解析为 ANSI / 文本 片段
  const segments = [];
  let lastEnd = 0;
  let match;
  ANSI_RE.lastIndex = 0;
  while ((match = ANSI_RE.exec(line)) !== null) {
    if (match.index > lastEnd) {
      segments.push({ ansi: false, text: line.slice(lastEnd, match.index) });
    }
    segments.push({ ansi: true, text: match[0] });
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd < line.length) {
    segments.push({ ansi: false, text: line.slice(lastEnd) });
  }

  let before = '';
  let selected = '';
  let after = '';
  let visualCol = 0;
  // mode: 'before' | 'selected' | 'after'
  let mode = 'before';

  for (const seg of segments) {
    if (seg.ansi) {
      // ANSI 码放到当前 mode 所在的区段；若已在 selected 则移到 after 避免干扰 Ink 样式
      if (mode === 'before') before += seg.text;
      else after += seg.text;
      continue;
    }
    for (const ch of seg.text) {
      const cw = isWideChar(ch.codePointAt(0)) ? 2 : 1;
      const nextCol = visualCol + cw;

      if (mode === 'before' && nextCol <= startCol) {
        before += ch;
      } else if (mode === 'before') {
        // 进入选中区
        mode = 'selected';
        selected += ch;
      } else if (mode === 'selected' && nextCol <= effEnd) {
        selected += ch;
      } else if (mode === 'selected') {
        // 离开选中区
        mode = 'after';
        after += ch;
      } else {
        after += ch;
      }
      visualCol = nextCol;
    }
  }

  return { before, selected, after };
}

/**
 * @deprecated 保留以保持向后兼容；新代码请使用 splitLineForHighlight 配合 Ink 组件样式
 */
export function highlightRange(line, startCol, endCol) {
  const plain = stripAnsi(line);
  const prefixSkip = getPrefixSkip(plain);
  startCol = Math.max(startCol, prefixSkip);
  if (startCol >= endCol) return line;
  const totalWidth = visualWidth(plain);
  if (startCol >= totalWidth) return line;
  const effEnd = endCol === Infinity || !isFinite(endCol) ? totalWidth : Math.min(endCol, totalWidth);
  if (startCol >= effEnd) return line;
  const segments = [];
  let lastEnd = 0;
  let match;
  ANSI_RE.lastIndex = 0;
  while ((match = ANSI_RE.exec(line)) !== null) {
    if (match.index > lastEnd) {
      segments.push({ ansi: false, text: line.slice(lastEnd, match.index) });
    }
    segments.push({ ansi: true, text: match[0] });
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd < line.length) {
    segments.push({ ansi: false, text: line.slice(lastEnd) });
  }
  let result = '';
  let visualCol = 0;
  for (const seg of segments) {
    if (seg.ansi) {
      result += seg.text;
      continue;
    }
    for (const ch of seg.text) {
      if (visualCol === startCol) {
        result += '\x1b[7m';
      }
      const cw = isWideChar(ch.codePointAt(0)) ? 2 : 1;
      visualCol += cw;
      result += ch;
      if (visualCol === effEnd) {
        result += '\x1b[0m';
      }
    }
  }
  if (visualCol > startCol && visualCol <= effEnd) {
    result += '\x1b[0m';
  }
  return result;
}

export function getLineHighlight(lineIdx, anchor, focus) {
  if (!anchor || !focus) return null;
  const l1 = anchor.lineIdx, c1 = anchor.col;
  const l2 = focus.lineIdx, c2 = focus.col;
  if (l1 === l2) {
    if (lineIdx !== l1) return null;
    return { startCol: Math.min(c1, c2), endCol: Math.max(c1, c2) };
  }
  const startLine = Math.min(l1, l2);
  const endLine = Math.max(l1, l2);
  if (lineIdx < startLine || lineIdx > endLine) return null;
  if (lineIdx === startLine) {
    return { startCol: l1 < l2 ? c1 : c2, endCol: Infinity };
  }
  if (lineIdx === endLine) {
    return { startCol: 0, endCol: l1 > l2 ? c1 : c2 };
  }
  return { startCol: 0, endCol: Infinity };
}

export function getSelectedText(logs, anchor, focus) {
  if (!anchor || !focus) return '';
  const l1 = anchor.lineIdx, c1 = anchor.col;
  const l2 = focus.lineIdx, c2 = focus.col;
  const startLine = Math.min(l1, l2);
  const endLine = Math.max(l1, l2);
  let startCol, endCol;
  if (l1 < l2) { startCol = c1; endCol = c2; }
  else if (l1 > l2) { startCol = c2; endCol = c1; }
  else { startCol = Math.min(c1, c2); endCol = Math.max(c1, c2); }
  const result = [];
  for (let i = startLine; i <= endLine; i++) {
    if (i < 0 || i >= logs.length) continue;
    const plain = stripAnsi(logs[i]);
    const totalW = visualWidth(plain);
    const prefixSkip = getPrefixSkip(plain);
    const s = i === startLine ? Math.max(prefixSkip, Math.min(startCol, totalW)) : prefixSkip;
    const e = i === endLine ? Math.min(endCol, totalW) : totalW;
    if (s >= e) { result.push(''); continue; }
    const { rest: fromStart } = takeVisualChars(plain, s);
    const { line: selected } = takeVisualChars(fromStart, e - s);
    result.push(selected);
  }
  return result.join('\n');
}

export function copyOsc52(text) {
  const b64 = Buffer.from(text, 'utf-8').toString('base64');
  process.stdout.write(`\x1b]52;c;${b64}\x07`);
}

// ============================================================
//  格式化
// ============================================================

export function formatElapsed(ms) {
  if (ms == null || ms < 0) return '';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m${secs}s`;
}

// ============================================================
//  安全退出
// ============================================================

let _exitGuard = false;
let _renderInstance = null;

export function setRenderInstance(inst) {
  _renderInstance = inst;
}

export function safeExit(code) {
  if (_exitGuard) return;
  _exitGuard = true;
  if (_renderInstance) {
    try { _renderInstance.unmount(); } catch (_) {}
    try { _renderInstance.clear(); } catch (_) {}
  }
  process.stdout.write('\x1b[2J\x1b[H\x1b[?1049l\x1b[?25h\x1b[?1000l\x1b[?1002l\x1b[?1006l');
  process.exitCode = code;
  process.exit(code);
}
