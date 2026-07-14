// TaskNode：单节点渲染 = 图标指示器 + 任务名称 + 三态复选框 + 进度/时长

import { taskColor } from '../utils/colors.mjs';
import { tick } from '../utils/tick.mjs';

const ICONS = {
  pending: '\u25CB',
  running: '\u25CF',
  done:    '\u2713',
  failed:  '\u2717',
  skipped: '\u25CC',
};

const ICON_COLORS = {
  pending: '\x1b[90m',
  running: '\x1b[32m',
  done:    '\x1b[32m',
  failed:  '\x1b[31m',
  skipped: '\x1b[2m',
};
const RST = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM  = '\x1b[2m';

export function fmtTime(ms) {
  if (ms == null) return '';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m < 60) return `${m}m${sec}s`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h${min}m${sec}s`;
}

// 二态复选框：0=隐藏 1=显示
const CHECKBOX = {
  0: '\u2610', // ☐
  1: '\u2611', // ☑
};

/**
 * @param {{ id: string, description: string, status: string, progress?: number, elapsed?: number, logFilter?: number }} task
 * @returns {string}
 */
export function taskNode(task) {
  const icon = ICONS[task.status] || ICONS.pending;
  let prefix;
  if (task.status === 'running') {
    // 呼吸动画：10帧循环 dim→dGr→brt→bld→grn→grn→bld→brt→dGr→dim
    const PULSE = [
      DIM,       DIM + '\x1b[32m',
      '\x1b[92m', BOLD + '\x1b[32m',
      '\x1b[32m', '\x1b[32m',
      BOLD + '\x1b[32m', '\x1b[92m',
      DIM + '\x1b[32m', DIM,
    ];
    prefix = PULSE[tick % 10] + icon + RST;
  } else {
    const iconColor = ICON_COLORS[task.status] || ICON_COLORS.pending;
    prefix = iconColor + icon + RST;
  }
  const name = taskColor(task.id) + task.description + RST;

  const GRAY = '\x1b[90m';
  const cb = GRAY + (CHECKBOX[task.logFilter ?? 1]) + RST;

  let right = '';
  if (task.progress != null) right += ` ${task.progress}`;
  if (task.elapsed != null) right += ` ${fmtTime(task.elapsed)}`;
  right = right ? GRAY + right + RST : ' ';
  return prefix + ' ' + name + ' ' + cb + right;
}
