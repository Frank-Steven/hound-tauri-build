// 筛选行：横向排列三个等级筛选按钮 + 一个自定义文本筛选，内建焦点与键盘/点击交互
//   - 等级按钮：enter/space 切换
//   - 自定义筛选：enter 进入编辑模式，再 enter 完成，space 切换启/禁用，ESC 取消编辑

import { button } from './button.mjs';
import { hLayout } from './h-layout.mjs';
import { toggleLevel } from './filter-bar.mjs';
import { charWidth } from '../utils/char-width.mjs';

const LEVELS = ['success', 'warning', 'info', 'error', 'log'];
const COLORS = { success: '\x1b[32m', warning: '\x1b[33m', info: '\x1b[36m', error: '\x1b[31m', log: '\x1b[36m' };
const LABELS = { success: 'Success', warning: 'Warning', info: 'Info', error: 'Error', log: 'Log' };
const NUM_LEVELS = LEVELS.length; // 5
const SEARCH_IDX = NUM_LEVELS;    // 第 6 项（搜索框）
const SEARCH_MIN = 14;

const DIM = '\x1b[2m';
const RST = '\x1b[0m';

/** 在含 ANSI 码的行中，找到视觉列位置 visX 对应的字符偏移 */
function visToCharIdx(line, visX) {
  let charIdx = 0;
  let visW = 0;
  while (charIdx < line.length && visW < visX) {
    if (line[charIdx] === '\x1b') {
      charIdx++;
      if ('[]P_^'.includes(line[charIdx])) charIdx++;
      while (charIdx < line.length && (line[charIdx] < '\x40' || line[charIdx] > '\x7e')) charIdx++;
      if (charIdx < line.length) charIdx++;
      continue;
    }
    if (line[charIdx] === '\x07') { charIdx++; continue; }
    visW += charWidth(line[charIdx]);
    charIdx++;
  }
  return charIdx;
}

/** 自定义筛选的渲染
 *  inactive + empty:  [ Filter_______ ]
 *  active + query:    [ hello world  ]
 *  editing:           [ hello world▐ ]
 */
function renderSearch(active, query, editMode, width) {
  const inner = width - 2; // │ + 空格

  if (editMode) {
    const cursor = '\x1b[7m\u258C\x1b[27m'; // ▌ 左半块光标
    const maxText = inner - 1; // 留光标位置
    const text = query ? query.slice(-maxText) : '';
    const pad = maxText - text.length;
    return DIM + '\u2502' + RST + ' ' + text + cursor + ' '.repeat(Math.max(0, pad));
  }

  if (query) {
    const text = query.slice(-inner);
    const pad = inner - text.length;
    const style = active ? RST : DIM;
    return DIM + '\u2502' + RST + ' ' + style + text + ' '.repeat(Math.max(0, pad)) + RST;
  }

  // 无内容: 灰色占位
  return DIM + '\u2502' + RST + ' ' + DIM + 'filter\u2026' + ' '.repeat(Math.max(0, inner - 7)) + RST;
}

/**
 * @param {object} filterState - { levels: string[], query: string, queryActive: boolean }
 * @param {() => void} onUpdate
 */
export function createFilterRow(filterState, onUpdate) {
  let focusedIdx = 0;
  let editing = false;

  /** 构建 hLayout items，搜索宽度填充剩余空间 */
  function buildItems(totalWidth) {
    const levelItems = LEVELS.map((level) => ({
      text: button(LABELS[level], {
        active: filterState.levels.includes(level),
        color: COLORS[level],
      }),
      width: LABELS[level].length + 3, // [X] + 1 间距
    }));

    const used = levelItems.reduce((s, it) => s + it.width, 0);
    const searchWidth = Math.max(SEARCH_MIN, totalWidth - used);
    const searchText = renderSearch(filterState.queryActive, filterState.query, editing, searchWidth);
    levelItems.push({ text: searchText, width: searchWidth });
    return levelItems;
  }

  /** 渲染筛选行：编辑时不反白；搜索框有内容时焦点高亮，等级按钮始终焦点高亮 */
  function render(totalWidth, focused) {
    const items = buildItems(totalWidth);
    const layout = hLayout(items, totalWidth);

    const doHighlight = focused && !editing;

    if (doHighlight && focusedIdx >= 0 && focusedIdx < layout.slots.length) {
      const s = layout.slots[focusedIdx];
      // 搜索框跳过 │ 前缀，只高亮文本区域
      const offset = focusedIdx === SEARCH_IDX ? 2 : 0;
      const a = visToCharIdx(layout.line, s.x + offset);
      const b = visToCharIdx(layout.line, s.x + s.width);
      layout.line =
        layout.line.slice(0, a) +
        '\x1b[7m' + layout.line.slice(a, b) + '\x1b[27m' +
        layout.line.slice(b);
    }

    return layout;
  }

  /** 处理键盘 */
  function handleKey(k) {
    const max = SEARCH_IDX;

    // ── 编辑模式：所有按键由搜索组件消费 ──
    if (editing) {
      if (k.name === 'escape') {
        editing = false;
        onUpdate(); return true;
      }
      if (k.name === 'return') {
        editing = false;
        if (filterState.query) filterState.queryActive = true;
        onUpdate(); return true;
      }
      if (k.name === 'backspace') {
        if (filterState.query.length > 0) {
          filterState.query = filterState.query.slice(0, -1);
          onUpdate();
        }
        return true;
      }
      // 可打印字符
      if (k.name.length === 1 && !k.ctrl && !k.meta) {
        filterState.query += k.name;
        onUpdate(); return true;
      }
      return true; // 编辑模式下消费所有其他按键
    }

    // ── 正常导航 ──
    if (k.name === 'left') {
      focusedIdx = Math.max(0, focusedIdx - 1);
      onUpdate(); return true;
    }
    if (k.name === 'right') {
      focusedIdx = Math.min(max, focusedIdx + 1);
      onUpdate(); return true;
    }

    // ── 激活 ──
    if (k.name === 'return' || k.name === 'space') {
      if (focusedIdx < NUM_LEVELS) {
        // 等级按钮：enter/space 均切换
        toggleLevel(filterState, LEVELS[focusedIdx]);
        onUpdate(); return true;
      }
      // 自定义筛选
      if (k.name === 'return') {
        editing = true;
        onUpdate(); return true;
      }
      if (k.name === 'space') {
        filterState.queryActive = !filterState.queryActive;
        onUpdate(); return true;
      }
    }

    return false;
  }

  /** 处理点击 — 搜索：单击切换开关，双击进入编辑；等级按钮：单击切换 */
  function handleClick(e, y) {
    for (let i = 0; i < _lastSlots.length; i++) {
      const s = _lastSlots[i];
      if (s && e.x >= s.x && e.x < s.x + s.width) {
        focusedIdx = i;
        if (editing) editing = false;
        if (i < NUM_LEVELS) {
          toggleLevel(filterState, LEVELS[i]);
          onUpdate(); return true;
        }
        // 搜索框：编辑中任意点击退出编辑；否则双击进入编辑，单击切换开关
        if (editing) {
          editing = false;
        } else {
          const now = Date.now();
          if (_lastSearchClick && now - _lastSearchClick < 400) {
            editing = true;
            _lastSearchClick = 0;
          } else {
            _lastSearchClick = now;
            filterState.queryActive = !filterState.queryActive;
          }
        }
        onUpdate(); return true;
      }
    }
    return false;
  }

  let _lastSlots = [];
  let _lastSearchClick = 0;

  function renderAndTrack(totalWidth, focused) {
    const layout = render(totalWidth, focused);
    _lastSlots = layout.slots;
    return layout;
  }

  return { render: renderAndTrack, handleKey, handleClick, isEditing: () => editing, exitEditing: () => { editing = false; } };
}
