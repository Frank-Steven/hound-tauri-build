// 日志文本选择 hook
// 选择直接作用于原始折行文本（无前缀），前缀区域不可选

import { charWidth } from './char-width.mjs';

/**
 * 在可视化列区间 [colS, colE) 插入反显 ANSI 码，不破坏已有 ANSI 序列
 */
function highlightRange(line, colS, colE) {
  if (colS >= colE) return line;
  let out = '';
  let vis = 0;
  let i = 0;
  let open = false;
  while (i < line.length) {
    if (!open && vis >= colS) { out += '\x1b[7m'; open = true; }
    if (open && vis >= colE) { out += '\x1b[27m'; open = false; }
    const ch = line[i];
    if (ch === '\x1b') {
      let seq = ch;
      i++;
      if (i < line.length && '[]P_^'.includes(line[i])) { seq += line[i]; i++; }
      while (i < line.length && (line[i] < '\x40' || line[i] > '\x7e')) { seq += line[i]; i++; }
      if (i < line.length) { seq += line[i]; i++; }
      out += seq;
      continue;
    }
    if (ch === '\x07') { out += ch; i++; continue; }
    out += ch;
    vis += charWidth(ch);
    i++;
  }
  if (open) out += '\x1b[27m';
  return out;
}

/**
 * 创建日志选择实例
 * @param {{ onUpdate?: () => void }} opts
 * @returns {{ setCtx, onMouse, onDrag, applySelection, clearSelection, getSelection }}
 */
export function createLogSelection({ onUpdate } = {}) {
  let selStart = null;    // { textLineIdx, col }
  let selEnd = null;      // { textLineIdx, col }
  let dragging = false;
  let ctx = null;         // { y, height, scrollState }

  /** 每帧渲染前更新点击上下文 */
  function setCtx(c) { ctx = c; }

  /**
   * 终端坐标 → 原始文本坐标
   * 列方向：e.x - 1(VT边框) - 2(前缀) = 原始文本列
   * 行方向：滚动后的展示行索引 = 原始文本行索引（与 rawFlat 一一对应）
   */
  function coord(e) {
    if (!ctx || !ctx.scrollState) return null;
    // 前缀区域和 VT 边框不可选
    if (e.x < 3) return null;
    const minIndex = Math.max(0, ctx.scrollState.maxIndex - ctx.height + 1);
    const textLineIdx = Math.max(minIndex, Math.min(minIndex + ctx.height - 1,
      minIndex + (Math.max(ctx.y, Math.min(ctx.y + ctx.height - 1, e.y)) - ctx.y)));
    const col = e.x - 3;
    return { textLineIdx, col };
  }

  /** 处理 mouse press/release 事件 */
  function onMouse(e) {
    if (!ctx || !ctx.scrollState) return;
    if (e.y < ctx.y || e.y >= ctx.y + ctx.height) return;

    if (e.type === 'press' && e.btn === 0) {
      const c = coord(e);
      if (!c) return; // 前缀区域不启动选择
      selStart = c;
      selEnd = { textLineIdx: c.textLineIdx, col: c.col + 1 }; // 至少 1 字符
      dragging = true;
      onUpdate?.();
    } else if (e.type === 'release' && dragging) {
      dragging = false;
      const c = coord(e);
      if (c) {
        selEnd = (c.textLineIdx === selStart.textLineIdx && c.col === selStart.col)
          ? { textLineIdx: c.textLineIdx, col: c.col + 1 } : c;
      }
      onUpdate?.();
    }
  }

  /** 处理拖拽（motion）事件 */
  function onDrag(e) {
    if (!dragging || e.btn !== 0) return;
    if (!ctx || !ctx.scrollState) return;
    const c = coord(e);
    if (!c) return; // 前缀区域不扩展选区
    selEnd = c;
    onUpdate?.();
  }

  /**
   * 将当前选区高亮应用到原始折行文本数组，返回新数组
   * @param {string[]} rawFlat - 原始折行文本（无前缀）
   * @param {number} textW - 单行最大宽度
   * @returns {string[]} 高亮后的文本数组
   */
  function applySelection(rawFlat, textW) {
    if (!selStart || !selEnd) return rawFlat;
    const sL = Math.min(selStart.textLineIdx, selEnd.textLineIdx);
    const eL = Math.max(selStart.textLineIdx, selEnd.textLineIdx);
    let sC, eC;
    if (selStart.textLineIdx === selEnd.textLineIdx) {
      sC = Math.min(selStart.col, selEnd.col);
      eC = Math.max(selStart.col, selEnd.col);
    } else if (selStart.textLineIdx < selEnd.textLineIdx) {
      sC = selStart.col; eC = selEnd.col;
    } else {
      sC = selEnd.col; eC = selStart.col;
    }

    const result = rawFlat.slice();
    for (let i = 0; i < result.length; i++) {
      if (i < sL || i > eL) continue;
      let cs = 0, ce = textW;
      if (i === sL && i === eL) { cs = sC; ce = eC; }
      else if (i === sL) { cs = sC; }
      else if (i === eL) { ce = eC; }
      result[i] = highlightRange(result[i], cs, ce);
    }
    return result;
  }

  /** 清除选择 */
  function clearSelection() {
    selStart = null;
    selEnd = null;
    dragging = false;
    onUpdate?.();
  }

  /** 获取当前选区状态 */
  function getSelection() {
    return { start: selStart, end: selEnd };
  }

  return { setCtx, onMouse, onDrag, applySelection, clearSelection, getSelection };
}
