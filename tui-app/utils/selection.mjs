// 文本选区：跨行选择模型 + 高亮染色

/**
 * 规范化选区，确保 start ≤ end
 * @param {{ line: number, col: number }} a
 * @param {{ line: number, col: number }} b
 */
export function normalize(a, b) {
  if (a.line < b.line || (a.line === b.line && a.col <= b.col)) {
    return { start: { line: a.line, col: a.col }, end: { line: b.line, col: b.col } };
  }
  return { start: { line: b.line, col: b.col }, end: { line: a.line, col: a.col } };
}

/**
 * 对行数组应用高亮
 * @param {string[]} lines - 原始行
 * @param {{ start: { line: number, col: number }, end: { line: number, col: number } } | null} sel
 * @param {{ prefixLen?: number }} opts - prefixLen 为每行前缀（如圆点）所占列数，不参与选择
 * @returns {string[]}
 */
export function applyHighlight(lines, sel, opts = {}) {
  if (!sel) return [...lines];
  const prefixLen = opts.prefixLen || 0;
  const { start, end } = sel;
  const out = [];

  for (let y = 0; y < lines.length; y++) {
    const text = lines[y];
    if (y < start.line || y > end.line) {
      out.push(text);
      continue;
    }

    const sc = (y === start.line) ? start.col + prefixLen : prefixLen;
    const ec = (y === end.line) ? end.col + prefixLen : text.length;

    if (sc >= ec) {
      out.push(text);
      continue;
    }

    const before = text.slice(0, sc);
    const mid = text.slice(sc, ec);
    const after = text.slice(ec);
    out.push(before + '\x1b[7m' + mid + '\x1b[0m' + after);
  }

  return out;
}
