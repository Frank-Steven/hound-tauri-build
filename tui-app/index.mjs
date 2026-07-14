// TUI 应用入口
/*
使用裸终端绘制 TUI
应用流程：
1. 注册两个新的终端缓存区，使用双缓存机制绘制 TUI
2. 结束后，恢复原始终端状态，并将结束内容打印到原始终端缓存区中
*/

// 模拟结束内容
const endContent = [
    '构建完成',
    'end',
];

// 为了模拟效果，当按下 Enter 时，模拟结束 TUI 应用

import { makePage, running, toggleFinished, setScrollCallback, isFooterEditing, exitPanel } from './demos/index.mjs';
import { initEvents, on, destroyEvents } from './utils/events.mjs';
import { advanceTick } from './utils/tick.mjs';
import { logSel } from './utils/focus.mjs';
import { getTerminalSize } from './utils/terminal-size.mjs';

const ALT_ON  = '\x1b[?1049h';
const ALT_OFF = '\x1b[?1049l';
const HOME    = '\x1b[H';
const CLEAR_EOS  = '\x1b[J';
const HIDE    = '\x1b[?25l';
const SHOW    = '\x1b[?25h';
const WRAP_OFF = '\x1b[?7l';
const WRAP_ON  = '\x1b[?7h';

// 双缓冲：后台构建完整帧后一次性切换，避免闪烁
let back = 0;
const bufs = ['', ''];

function buildFrame() {
  advanceTick();
  const page = makePage();
  bufs[back] = HOME + page.join('\n') + CLEAR_EOS;
  back = 1 - back;
  process.stdout.write(bufs[1 - back]);
}

function redraw() {
  buildFrame();
}

/** ESC 分层：编辑→退出编辑，选择→清除选择，退出面板→隐藏面板，否则→显示退出面板 */
function bindScrolling() {
  on('key', (k) => {
    if (k.name === 'escape') {
      if (isFooterEditing()) return;       // 编辑中：filterRow 处理
      if (logSel.active) {                 // 有选择：清除
        logSel.active = false;
        logSel.startLine = -1;
        logSel.endLine = -1;
        requestRedraw();
        return;
      }
      if (exitPanel.visible) {             // 退出面板已显示：隐藏
        exitPanel.visible = false;
        requestRedraw();
        return;
      }
      exitPanel.visible = true;            // 否则：显示退出面板
      exitPanel.selected = 'n';
      requestRedraw();
      return;
    }

    // 退出面板可见时：锁定焦点
    if (exitPanel.visible) {
      // Y → 直接退出
      if (k.name === 'y' || k.name === 'Y') {
        clearInterval(updateTimer);
        destroyEvents();
        process.stdout.write(ALT_OFF + WRAP_ON + SHOW);
        process.stdout.write(endContent.join('\n') + '\n');
        process.exit(0);
      }
      // N → 直接取消
      if (k.name === 'n' || k.name === 'N') {
        exitPanel.visible = false;
        requestRedraw();
        return;
      }
      // ←/→/↑/↓/Tab 切换选中高亮
      if (k.name === 'left' || k.name === 'right' || k.name === 'up' || k.name === 'down' || k.name === 'tab') {
        exitPanel.selected = exitPanel.selected === 'y' ? 'n' : 'y';
        requestRedraw(); return;
      }
      // Enter → 确认当前选中
      if (k.name === 'return' || k.name === 'enter') {
        if (exitPanel.selected === 'y') {
          clearInterval(updateTimer);
          destroyEvents();
          process.stdout.write(ALT_OFF + WRAP_ON + SHOW);
          process.stdout.write(endContent.join('\n') + '\n');
          process.exit(0);
        } else {
          exitPanel.visible = false;
          requestRedraw();
        }
        return;
      }
      return; // 锁定：拦截所有其他按键
    }
  });

  // 退出面板点击：Y→退出，N→取消；其他区域→锁定
  on('click', (e) => {
    if (!exitPanel.visible) return;
    const { rows: H, columns: W } = getTerminalSize();
    const modalW = 28;
    const modalH = 4;
    const mx = Math.max(0, Math.floor((W - modalW) / 2));
    const my = Math.max(0, Math.floor((H - modalH) / 2));
    if (e.y === my + 2) {
      const yX = mx + 3;
      const nX = mx + 16;
      if (e.x >= yX && e.x < yX + 7) {          // [Y] → 退出
        clearInterval(updateTimer);
        destroyEvents();
        process.stdout.write(ALT_OFF + WRAP_ON + SHOW);
        process.stdout.write(endContent.join('\n') + '\n');
        process.exit(0);
      } else if (e.x >= nX && e.x < nX + 7) {   // [N] → 取消
        exitPanel.visible = false;
        requestRedraw();
      }
    }
    // 点击面板其他位置 → 无操作（已锁定，不传递给下层）
  });
}

// ============================================================
//  应用流程
// ============================================================

process.stdout.write(ALT_ON + WRAP_OFF + HIDE);

initEvents();
bindScrolling();

// 防抖：同一轮事件循环中多次触发只重绘一次
let _pending = false;
function requestRedraw() {
  if (!_pending) {
    _pending = true;
    Promise.resolve().then(() => { _pending = false; redraw(); });
  }
}

// 注入重绘回调，滚动事件即时生效（必须在 redraw 之前，确保 useScroll 的回调可用）
setScrollCallback(requestRedraw);

// 首帧立即渲染
redraw();

on('resize', redraw);
const updateTimer = setInterval(redraw, 500);
