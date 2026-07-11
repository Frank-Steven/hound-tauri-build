/**
 * @file TUI 常量定义
 */

// ============================================================
//  任务状态
// ============================================================

export const STATUS = { PENDING: 'pending', RUNNING: 'running', DONE: 'done', FAILED: 'failed', SKIPPED: 'skipped' };

export const STATUS_ICONS = {
  [STATUS.PENDING]: '\u25CB',
  [STATUS.RUNNING]: '\u25CF',
  [STATUS.DONE]: '\u2713',
  [STATUS.FAILED]: '\u2717',
  [STATUS.SKIPPED]: '\u00D7',
};

export const STATUS_COLORS = {
  [STATUS.PENDING]: 'grey',
  [STATUS.RUNNING]: 'cyan',
  [STATUS.DONE]: 'green',
  [STATUS.FAILED]: 'red',
  [STATUS.SKIPPED]: 'grey',
};

// ============================================================
//  日志匹配
// ============================================================

export const ERROR_RE = /(?:error|fail|fatal|ENOENT|ECONNREFUSED|EACCES)/i;
export const DEPRECATION_RE = /DeprecationWarning|\[DEP\d+\]/i;
export const RETRY_RE = /\[retry\]/i;

// ============================================================
//  ANSI / OSC 控制序列
// ============================================================

export const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;
export const OSC_RE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

// ============================================================
//  终端尺寸阈值 — 各区域最小行数
// ============================================================

/** 横幅 / 统计 / 退出提示 / 分隔空白 */
export const MIN_FIXED = 1;
/** 任务树 / 任务列表最少可见行数 */
export const MIN_TASK = 3;
/** 运行视图日志面板最少可见行数（不含边框） */
export const MIN_LOG_VISIBLE = 5;
/** 日志面板边框行数 */
export const LOG_BORDER = 2;
/** 滚动指示器占用行数 */
export const MIN_SCROLL = 1;
/** 滚动区内容区域最小高度（扣除边框和指示器） */
export const MIN_SCROLL_CONTENT = 3;

// 运行视图:
//   banner(1) + spacer(1) + taskContent(3) + taskScroll(1) + spacer(1) + logBorder(2) + logContent(5) = 14
export const MIN_RUNNING = MIN_FIXED * 3 + (MIN_SCROLL_CONTENT + MIN_SCROLL) + LOG_BORDER + MIN_LOG_VISIBLE;

// 结算成功:
//   banner(1) + stats(1) + spacer(1) + taskContent(3) + taskScroll(1) + flex(1) + hint(1) = 9
export const MIN_EXIT_OK = MIN_FIXED * 4 + (MIN_SCROLL_CONTENT + MIN_SCROLL) + 1;

// 结算失败:
//   banner(1) + stats(1) + spacer(1) + errBorder(2) + errContent(3) + errScroll(1) + spacer(1) +
//   taskContent(3) + taskScroll(1) + flex(1) + hint(1) = 16
export const MIN_EXIT_ERR = MIN_FIXED * 5 + (LOG_BORDER + MIN_SCROLL_CONTENT + MIN_SCROLL) + (MIN_SCROLL_CONTENT + MIN_SCROLL) + 1;

export const MIN_ROWS = Math.max(MIN_RUNNING, MIN_EXIT_OK, MIN_EXIT_ERR);
export const MIN_COLS = 30;
