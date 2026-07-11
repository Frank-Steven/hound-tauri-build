/**
 * @file 构建 TUI 应用（Ink 5）— 入口
 */

import React, { useState, useEffect, useRef } from 'react';
import { render, Box, Text, useInput, useStdin } from 'ink';
import net from 'net';
import { STATUS, MIN_ROWS, MIN_COLS } from './constants.mjs';
import { setRenderInstance, safeExit, wrapLine, stripAnsi, isErrorLine,
         getLineHighlight, highlightRange, getSelectedText, copyOsc52 } from './utils.mjs';
import SizeWarning from './components/SizeWarning.mjs';
import RunningView from './views/RunningView.mjs';
import ExitView from './views/ExitView.mjs';

const IPC_PORT = parseInt(process.argv[2], 10);
if (!IPC_PORT) {
  process.stderr.write('Usage: node tui-app/index.mjs <port>\n');
  process.exit(1);
}

// ============================================================
//  Module-level state
// ============================================================

let gTasks = [];
let gExitOk = false;
let gRenderInstance = null;
let gExiting = false;
let gFirstErrorLine = -1;
let gFirstErrorSourceIdx = -1;
let gErrorLogs = [];
let gExitReceived = false;
let gSelAnchor = null;
let gSelFocus = null;
let gIsMouseDown = false;

// ============================================================
//  App
// ============================================================

function App({ port }) {
  const [tasks, setTasks] = useState([]);
  const [rows, setRows] = useState([]);
  const [logState, setLogState] = useState({ logs: [], scrollOffset: 0 });
  const [exiting, setExiting] = useState(false);
  const [tick, setTick] = useState(0);
  const [selAnchor, setSelAnchor] = useState(null);
  const [selFocus, setSelFocus] = useState(null);
  const { internal_eventEmitter } = useStdin();
  const scrollOffsetRef = useRef(0);
  const tasksRef = useRef(tasks);
  const runningSinceRef = useRef([]);
  const logsRef = useRef([]);
  const sourceLogsRef = useRef([]);
  const logPanelYStart = useRef(1);
  const logPanelYEnd = useRef(1);
  const logVisibleRef = useRef(20);
  const [taskScrollOffset, setTaskScrollOffset] = useState(0);
  const taskPanelYStart = useRef(1);
  const taskPanelYEnd = useRef(1);
  const taskVisibleRef = useRef(10);
  const taskTotalRef = useRef(0);
  // 缓存终端尺寸，避免渲染时反复读取 process.stdout
  const termSizeRef = useRef({ rows: process.stdout.rows || 24, cols: process.stdout.columns || 80 });

  tasksRef.current = tasks;
  scrollOffsetRef.current = logState.scrollOffset;
  logsRef.current = logState.logs;
  gSelAnchor = selAnchor;
  gSelFocus = selFocus;

  // 100ms 计时器
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(timer);
  }, []);

  // TCP 连接
  useEffect(() => {
    let buf = '';
    const sock = net.createConnection({ port, host: '127.0.0.1' });
    sock.setEncoding('utf8');

    sock.on('data', (chunk) => {
      buf += chunk;
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const l of lines) {
        if (!l.trim()) continue;
        try { handleMsg(JSON.parse(l)); } catch (_) { /* skip */ }
      }
    });

    sock.on('end', () => {
      if (buf.trim()) {
        try { handleMsg(JSON.parse(buf)); } catch (_) { /* skip */ }
      }
      gTasks = [...tasksRef.current];
      gExitOk = false;
      safeExit(0);
    });

    sock.on('error', () => {
      gTasks = [...tasksRef.current];
      gExitOk = false;
      safeExit(0);
    });

    return () => {
      try { sock.destroy(); } catch (_) { /* ok */ }
    };
  }, []);

  // 键盘
  useInput((_input, key) => {
    if (exiting) {
      if (key.escape) {
        setSelAnchor(null);
        setSelFocus(null);
        safeExit(gExitOk ? 0 : 1);
      }
      if (key.return) {
        safeExit(gExitOk ? 0 : 1);
      }
    }
    if (key.escape && !exiting) {
      if (selAnchor || selFocus) {
        setSelAnchor(null);
        setSelFocus(null);
      }
      return;
    }
    const total = logState.logs.length;
    if (total === 0) return;
    const visible = logVisibleRef.current;
    const maxOffset = Math.max(0, total - visible);
    if (key.upArrow) {
      setLogState((prev) => ({ ...prev, scrollOffset: Math.min(maxOffset, prev.scrollOffset + 1) }));
    } else if (key.downArrow) {
      setLogState((prev) => ({ ...prev, scrollOffset: Math.max(0, prev.scrollOffset - 1) }));
    } else if (key.pageUp) {
      setLogState((prev) => ({ ...prev, scrollOffset: Math.min(maxOffset, prev.scrollOffset + visible) }));
    } else if (key.pageDown) {
      setLogState((prev) => ({ ...prev, scrollOffset: Math.max(0, prev.scrollOffset - visible) }));
    } else if (key.home) {
      setLogState((prev) => ({ ...prev, scrollOffset: maxOffset }));
    } else if (key.end) {
      setLogState((prev) => ({ ...prev, scrollOffset: 0 }));
    }
  });

  // 鼠标事件
  useEffect(() => {
    process.stdout.write('\x1b[?1000h\x1b[?1002h\x1b[?1006h');

    const onMouse = (chunk) => {
      const str = chunk.toString();
      const m = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
      if (!m) return;
      const btn = parseInt(m[1], 10);
      const px = parseInt(m[2], 10);
      const py = parseInt(m[3], 10);
      const isPress = m[4] === 'M';

      // 滚轮
      if (btn === 64 || btn === 65) {
        const step = 3;
        const taskTotal = taskTotalRef.current;
        if (taskTotal > 0 && !(py >= logPanelYStart.current && py <= logPanelYEnd.current)) {
          const visible = taskVisibleRef.current;
          const maxOffset = Math.max(0, taskTotal - visible);
          if (btn === 64) {
            setTaskScrollOffset((prev) => Math.max(0, prev - step));
          } else {
            setTaskScrollOffset((prev) => Math.min(maxOffset, prev + step));
          }
          return;
        }
        if (py >= logPanelYStart.current && py <= logPanelYEnd.current) {
          const total = logsRef.current.length;
          if (total === 0) return;
          const visible = logVisibleRef.current;
          const maxOffset = Math.max(0, total - visible);
          if (btn === 64) {
            setLogState((prev) => ({ ...prev, scrollOffset: Math.min(maxOffset, prev.scrollOffset + step) }));
          } else if (btn === 65) {
            setLogState((prev) => ({ ...prev, scrollOffset: Math.max(0, prev.scrollOffset - step) }));
          }
          return;
        }
        return;
      }

      // 文本选择
      if (btn === 0 && isPress) {
        const visible = logVisibleRef.current;
        const total = logsRef.current.length;
        if (py < logPanelYStart.current + 1 || py > logPanelYStart.current + visible || total === 0) {
          setSelAnchor(null);
          setSelFocus(null);
          return;
        }
        const clampedOffset = Math.min(scrollOffsetRef.current, Math.max(0, total - visible));
        const start = total - visible - clampedOffset;
        const lineIdx = start + (py - logPanelYStart.current - 1);
        if (lineIdx < 0 || lineIdx >= total) return;
        const col = Math.max(0, px - 1);
        const anchor = { lineIdx, col };
        setSelAnchor(anchor);
        setSelFocus(anchor);
        gSelAnchor = anchor;
        gSelFocus = anchor;
        gIsMouseDown = true;
      } else if (btn === 32) {
        if (!gSelAnchor) return;
        const visible = logVisibleRef.current;
        const total = logsRef.current.length;
        let offset = Math.min(scrollOffsetRef.current, Math.max(0, total - visible));
        const topY = logPanelYStart.current + 1;
        const bottomY = logPanelYStart.current + visible;
        if (py <= topY && offset < total - visible) {
          offset = Math.min(total - visible, offset + 1);
          setLogState(prev => ({ ...prev, scrollOffset: offset }));
        } else if (py >= bottomY && offset > 0) {
          offset = Math.max(0, offset - 1);
          setLogState(prev => ({ ...prev, scrollOffset: offset }));
        }
        const start = total - visible - offset;
        const rawLineIdx = start + Math.max(0, Math.min(visible - 1, py - topY));
        const lineIdx = Math.max(0, Math.min(total - 1, rawLineIdx));
        const col = Math.max(0, px - 1);
        const focus = { lineIdx, col };
        setSelFocus(focus);
        gSelFocus = focus;
      } else if (btn === 0 && !isPress) {
        gIsMouseDown = false;
        if (gSelAnchor) {
          const text = getSelectedText(logsRef.current, gSelAnchor, gSelFocus);
          if (text.length > 0) {
            copyOsc52(text);
          }
        }
      }
    };

    internal_eventEmitter.on('input', onMouse);
    return () => {
      process.stdout.write('\x1b[?1000l\x1b[?1002l\x1b[?1006l');
      internal_eventEmitter.removeListener('input', onMouse);
    };
  }, []);

  // resize
  useEffect(() => {
    const onResize = () => {
      termSizeRef.current = { rows: process.stdout.rows || 24, cols: process.stdout.columns || 80 };
      if (gExitReceived) return;
      const srcLines = sourceLogsRef.current;
      if (srcLines.length === 0) { setTick(t => t + 1); return; }
      const newMaxWidth = Math.max(20, (process.stdout.columns || 80) - 4);
      const newLogs = [];
      for (const src of srcLines) {
        newLogs.push(...wrapLine(src, newMaxWidth, 2));
      }
      const prevLogs = logsRef.current;
      const prevOffset = scrollOffsetRef.current;
      const prevVisible = logVisibleRef.current;
      const newTotal = newLogs.length;
      const newVisible = Math.max(5, Math.min(prevVisible, (process.stdout.rows || 24) - 8));
      let newOffset;
      if (prevLogs.length > 0 && prevOffset === 0) {
        newOffset = 0;
      } else if (prevLogs.length > 0 && prevVisible > 0) {
        const prevTopIdx = prevLogs.length - prevVisible - prevOffset;
        const ratio = Math.max(0, Math.min(1, prevTopIdx / Math.max(1, prevLogs.length)));
        const newTopIdx = Math.round(ratio * newTotal);
        newOffset = Math.max(0, newTotal - newVisible - newTopIdx);
      } else {
        newOffset = 0;
      }
      gFirstErrorLine = -1;
      for (let i = 0; i < newLogs.length; i++) {
        if (isErrorLine(newLogs[i])) {
          gFirstErrorLine = i;
          break;
        }
      }
      setLogState({ logs: newLogs, scrollOffset: newOffset });
    };
    process.stdout.on('resize', onResize);
    return () => { process.stdout.removeListener('resize', onResize); };
  }, []);

  function handleMsg(msg) {
    switch (msg.type) {
      case 'init':
        gExitReceived = false;
        gFirstErrorLine = -1;
        gFirstErrorSourceIdx = -1;
        sourceLogsRef.current = [];
        setSelAnchor(null);
        setSelFocus(null);
        setTasks(
          (msg.tasks || []).map((item) =>
            typeof item === 'string'
              ? { name: item, status: STATUS.PENDING }
              : { ...item, status: item.status || STATUS.PENDING },
          ),
        );
        setRows(msg.rows || []);
        setLogState({ logs: [], scrollOffset: 0 });
        break;

      case 'status':
        setTasks((prev) => {
          const next = [...prev];
          if (msg.index < next.length) {
            next[msg.index] = {
              ...next[msg.index],
              status: msg.status || STATUS.PENDING,
              elapsed: msg.elapsed,
            };
            if (msg.color != null) {
              next[msg.index].color = msg.color;
            }
            if (msg.status === STATUS.RUNNING) {
              runningSinceRef.current[msg.index] = Date.now();
            }
          }
          return next;
        });
        break;

      case 'log':
        if (gExitReceived || msg.text == null) break;
        const bulletMatch = msg.text.match(/^(\x1b\[\d+m\u25cf\x1b\[0m) /);
        const plain = bulletMatch
          ? bulletMatch[1] + ' ' + stripAnsi(msg.text.slice(bulletMatch[0].length))
          : stripAnsi(msg.text);
        const maxLogWidth = Math.max(20, (process.stdout.columns || 80) - 4);
        const wrapped = wrapLine(plain, maxLogWidth, 2);
        sourceLogsRef.current.push(plain);
        if (sourceLogsRef.current.length > 2000) {
          sourceLogsRef.current.shift();
          if (gFirstErrorSourceIdx >= 0) gFirstErrorSourceIdx--;
        }
        if (gFirstErrorSourceIdx < 0 && isErrorLine(plain)) {
          gFirstErrorSourceIdx = sourceLogsRef.current.length - 1;
        }
        setLogState((prev) => {
          const next = [...prev.logs.slice(-2000), ...wrapped];
          if (gFirstErrorLine < 0 && isErrorLine(plain)) {
            gFirstErrorLine = next.length - 1;
          }
          const newOffset = (gIsMouseDown && gSelAnchor)
            ? prev.scrollOffset + wrapped.length
            : (prev.scrollOffset > 0 ? prev.scrollOffset + wrapped.length : 0);
          return { logs: next, scrollOffset: newOffset };
        });
        break;

      case 'exit':
        gExitReceived = true;
        gTasks = [...tasksRef.current];
        gExitOk = msg.ok !== false;
        setSelAnchor(null);
        setSelFocus(null);
        setTaskScrollOffset(0);
        if (!gExitOk) {
          let errorSources;
          if (gFirstErrorSourceIdx >= 0) {
            errorSources = sourceLogsRef.current.slice(gFirstErrorSourceIdx).filter(isErrorLine);
          } else {
            const last30 = sourceLogsRef.current.slice(-30);
            const filtered = last30.filter(isErrorLine);
            errorSources = filtered;
          }
          const maxLogWidth = Math.max(20, (process.stdout.columns || 80) - 4);
          const errorLogs = [];
          for (const src of errorSources) {
            errorLogs.push(...wrapLine(src, maxLogWidth, 2));
          }
          gErrorLogs = errorLogs;
          setLogState({ logs: errorLogs, scrollOffset: 0 });
        } else {
          setLogState(prev => ({ ...prev, logs: [] }));
        }
        setExiting(true);
        break;
    }
  }

  // ============================================================
  //  渲染
  // ============================================================

  const { logs, scrollOffset } = logState;

  // 终端尺寸检测（用缓存值，避免渲染时反复读取 process.stdout）
  const _TH = termSizeRef.current.rows;
  if (_TH < MIN_ROWS || termSizeRef.current.cols < MIN_COLS) {
    return React.createElement(SizeWarning, { terminalHeight: _TH, terminalWidth: termSizeRef.current.cols });
  }

  // 计算统计
  const done = tasks.filter((t) => t.status === STATUS.DONE).length;
  const failed = tasks.filter((t) => t.status === STATUS.FAILED).length;
  const skipped = tasks.filter((t) => t.status === STATUS.SKIPPED).length;
  const total = tasks.length;

  if (exiting) {
    const ok = gExitOk;
    const hasError = !ok && logs.length > 0;
    const allRows = rows.length > 0
      ? rows
      : tasks.map((t, i) => ({ name: t.name, color: t.color, indices: [i], prefix: '', depth: 0 }));

    // === 成功：任务列表填满到退出提示上方 ===
    // Fixed: banner(1) + stats(1) + spacer(1) + spacer before tasks(1) + hint(1) = 5
    // Task list: TH - 5 - 1(bottom flex) = TH - 6
    // === 失败：任务列表约占可用空间的 30%，错误日志占主体 ===
    // Fixed: banner(1) + stats(1) + spacer(1) + spacer before tasks(1) + hint(1) + bottom flex(1) = 6
    // Task list: ~30% of (TH - 9)
    const _exitRowCnt = hasError
      ? Math.min(allRows.length, Math.max(3, Math.floor((_TH - 9) * 0.3)))
      : Math.min(allRows.length, Math.max(3, _TH - 6));

    return React.createElement(ExitView, {
      _TH, tasks, logs, scrollOffset,
      done, failed, skipped, total, ok, hasError,
      _exitRowCnt, allRows, taskScrollOffset,
      logVisibleRef, logPanelYStart, logPanelYEnd,
      taskPanelYStart, taskPanelYEnd, taskTotalRef, taskVisibleRef,
      selAnchor, selFocus,
    });
  }

  return React.createElement(RunningView, {
    _TH, tasks, rows, logs, scrollOffset,
    done, failed, skipped, total,
    runningSinceRef,
    logVisibleRef, logPanelYStart, logPanelYEnd,
    taskPanelYStart, taskPanelYEnd,
    taskVisibleRef, taskTotalRef,
    selAnchor, selFocus,
    taskScrollOffset,
  });
}

// ============================================================
//  启动
// ============================================================

// App 组件内部自动检测终端尺寸，过小时渲染 SizeWarning 提示页
// resize 事件由 App 组件内的 useEffect 处理

gRenderInstance = render(React.createElement(ErrorBoundaryWrapper, null, React.createElement(App, { port: IPC_PORT })));
setRenderInstance(gRenderInstance);

function ErrorBoundaryWrapper({ children }) {
  const [hasError, setHasError] = React.useState(false);
  React.useEffect(() => {
    const orig = process.listeners('uncaughtException').pop();
    const handler = (err) => {
      process.stderr.write('TUI Error: ' + err.message + '\n' + err.stack + '\n');
      safeExit(1);
    };
    process.on('uncaughtException', handler);
    return () => { process.removeListener('uncaughtException', handler); };
  }, []);
  if (hasError) return null;
  try { return children; } catch (e) {
    process.stderr.write('TUI Error: ' + e.message + '\n');
    safeExit(1);
    return null;
  }
}
