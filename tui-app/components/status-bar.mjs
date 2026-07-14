// StatusBar 组件

import { text } from './text.mjs';
import { tick } from '../utils/tick.mjs';

const DIM = '\x1b[2m';
const RST = '\x1b[0m';
const HIGHLIGHT = '\x1b[1;37m';

/** @param {{ minIndex: number, maxIndex: number, total: number, cursorLine?: number }} */
export function statusBar({ minIndex, maxIndex, total, cursorLine }) {
  const range = `${minIndex + 1}-${maxIndex + 1} / ${total}`;
  let line = `[ ${range} ]`;
  if (cursorLine != null && cursorLine >= minIndex && cursorLine <= maxIndex) {
    const cur = cursorLine + 1;
    line += `  \u25B8${HIGHLIGHT}L${cur}${RST}${DIM}`;
  }
  return DIM + line + RST;
}

/**
 * 构建状态横幅 → hLayout items
 * @param {{ finished: boolean, pending: number, running: number, done: number, failed: number, skipped: number }} stats
 * @returns {Array<{ text: string, width: number }>}
 */
export function buildStatusBar(stats) {
  const label = stats.finished ? '[Finished]' : '[Building]';
  const Z = '\x1b[39;22m';  // 只重置前景色+粗细，保留背景
  const BOLD = '\x1b[1m';
  const DIM  = '\x1b[2m';

  function item(icon, color, count) {
    return `${color}${icon}${Z} ${count}`;
  }

  // 呼吸动画：10帧循环 dim→dGr→brt→bld→grn→grn→bld→brt→dGr→dim
  const PULSE = [
    DIM,       DIM + '\x1b[32m',
    '\x1b[92m', BOLD + '\x1b[32m',
    '\x1b[32m', '\x1b[32m',
    BOLD + '\x1b[32m', '\x1b[92m',
    DIM + '\x1b[32m', DIM,
  ];
  const runningText = `${PULSE[tick % 10]}\u25CF${Z} ${stats.running}`;

  const items = [
    { text: text(label, { bold: true }), width: label.length + 1 },
    { text: runningText,                  width: 3 + String(stats.running).length },
    { text: item('\u25CB', '\x1b[90m', stats.pending),  width: 3 + String(stats.pending).length },
    { text: item('\u2713', '\x1b[32m', stats.done),     width: 3 + String(stats.done).length },
    { text: item('\u2717', '\x1b[31m', stats.failed),   width: 3 + String(stats.failed).length },
    { text: item('\u25CC', '\x1b[2m', stats.skipped),   width: 3 + String(stats.skipped).length },
  ];

  return items;
}
