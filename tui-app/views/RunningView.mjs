/**
 * @file 运行视图（TUI 构建中页面）
 */

import React from 'react';
import { Box, Text } from 'ink';
import { STATUS, MIN_FIXED, MIN_TASK, MIN_LOG_VISIBLE, LOG_BORDER, MIN_SCROLL, MIN_SCROLL_CONTENT } from '../constants.mjs';
import { formatElapsed } from '../utils.mjs';
import LogPanel from '../components/LogPanel.mjs';
import TaskTree from '../components/TaskTree.mjs';

/**
 * @param {object} p
 * @param {number} p._TH - 终端行数
 * @param {import('../index.mjs').Task[]} p.tasks
 * @param {Array} p.rows
 * @param {string[]} p.logs
 * @param {number} p.scrollOffset
 * @param {number} p.done
 * @param {number} p.failed
 * @param {number} p.skipped
 * @param {number} p.total
 * @param {{ current: number[] }} p.runningSinceRef
 * @param {{ current: number }} p.logVisibleRef
 * @param {{ current: number }} p.logPanelYStart
 * @param {{ current: number }} p.logPanelYEnd
 * @param {{ current: number }} p.taskPanelYStart
 * @param {{ current: number }} p.taskPanelYEnd
 * @param {{ current: number }} p.taskVisibleRef
 * @param {{ current: number }} p.taskTotalRef
 * @param {{ lineIdx: number, col: number }|null} p.selAnchor
 * @param {{ lineIdx: number, col: number }|null} p.selFocus
 * @returns {React.ReactElement}
 */
export default function RunningView(p) {
  const {
    _TH, tasks, rows, logs, scrollOffset,
    done, failed, skipped, total,
    runningSinceRef,
    logVisibleRef, logPanelYStart, logPanelYEnd,
    taskPanelYStart, taskPanelYEnd,
    taskVisibleRef, taskTotalRef,
    selAnchor, selFocus,
    taskScrollOffset,
  } = p;

  // 动态计时
  const getLiveElapsed = (ri) => {
    if (runningSinceRef.current[ri] != null)
      return Date.now() - runningSinceRef.current[ri];
    return null;
  };

  // 过滤：收起已完成节点
  const visibleRows = (() => {
    const src = rows.length > 0
      ? rows
      : tasks.map((t, i) => ({ name: t.name, color: t.color, indices: [i], prefix: '', depth: 0 }));
    const n = src.length;
    const allDone = src.map((row) =>
      row.indices.every((idx) => {
        const s = tasks[idx]?.status;
        return s === STATUS.DONE || s === STATUS.SKIPPED;
      }),
    );
    const parent = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      for (let p2 = i - 1; p2 >= 0; p2--) {
        if (src[p2].depth < src[i].depth) { parent[i] = p2; break; }
      }
    }
    const groups = new Map();
    for (let i = 0; i < n; i++) {
      const key = `${parent[i]}:${src[i].depth}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(i);
    }
    const vis = new Array(n).fill(false);
    for (let i = n - 1; i >= 0; i--) {
      if (!allDone[i]) { vis[i] = true; continue; }
      for (let j = i + 1; j < n && src[j].depth > src[i].depth; j++) {
        if (vis[j]) { vis[i] = true; break; }
      }
    }
    for (const indices of groups.values()) {
      if (indices.some((i) => vis[i])) {
        for (const i of indices) vis[i] = true;
      }
    }
    return src.filter((_, i) => vis[i]);
  })();

  // 计算任务树尺寸
  const taskTotal = visibleRows.length;
  taskTotalRef.current = taskTotal;
  // 非任务空间(固定): banner(1) + spacer(1) + spacer(1) + logBorder(2) + minLogVisible(5) = 10
  const nonTaskMin = MIN_FIXED * 2 + 1 + LOG_BORDER + MIN_LOG_VISIBLE;
  const _taskCap = Math.max(MIN_SCROLL_CONTENT + MIN_SCROLL, _TH - nonTaskMin - 1); // -1 给日志面板 flex 余量
  const _taskRowsRaw = Math.min(taskTotal, _taskCap);
  // 指示器占 1 行，需要时内容区域扣减指示器后仍 >= MIN_SCROLL_CONTENT
  const showIndicator = taskTotal > _taskRowsRaw;
  const _taskRows = showIndicator ? Math.max(MIN_SCROLL_CONTENT, _taskRowsRaw - MIN_SCROLL) : _taskRowsRaw;
  const taskOffset = Math.min(taskScrollOffset, Math.max(0, taskTotal - _taskRows));
  const displayedRows = visibleRows.slice(taskOffset, taskOffset + _taskRows);
  taskVisibleRef.current = _taskRows;
  // Y 坐标：banner(Y=1) + spacer(Y=2) → 首行任务 Y=3
  const taskYBase = 3;

  return React.createElement(
    Box,
    { flexDirection: 'column', height: _TH, overflow: 'hidden' },
    // 构建横幅
    React.createElement(
      Box, null,
      React.createElement(
        Text,
        { backgroundColor: 'cyan', color: 'black', bold: true },
        ` Build  [${done}/${total}] ` + (failed > 0 ? ` ${failed} failed ` : '') + (skipped > 0 ? ` ${skipped} skipped ` : ''),
      ),
    ),
    React.createElement(Box, { height: 1 }),
    // 任务树
    React.createElement(TaskTree, {
      rows: displayedRows, tasks, keyPrefix: 'r',
      getTaskElapsed: (idx) => {
        const task = tasks[idx];
        return task?.status === STATUS.RUNNING && runningSinceRef.current[idx] != null
          ? Date.now() - runningSinceRef.current[idx]
          : null;
      },
      getChainExtra: (members, row) => {
        const allTerminal = members.every((m) => m.status === STATUS.DONE || m.status === STATUS.SKIPPED);
        let chainElapsed = null;
        if (allTerminal) {
          chainElapsed = Math.max(...members.map((m) => m.elapsed || 0));
        } else {
          const runningIdx = row.indices.find((i) => tasks[i]?.status === STATUS.RUNNING);
          if (runningIdx != null) {
            const live = (() => {
              const t = tasks[runningIdx];
              return t?.status === STATUS.RUNNING && runningSinceRef.current[runningIdx] != null
                ? Date.now() - runningSinceRef.current[runningIdx]
                : null;
            })();
            if (live != null) chainElapsed = live;
          }
        }
        return chainElapsed != null
          ? React.createElement(Text, { color: 'grey' }, `  ${formatElapsed(chainElapsed)}`)
          : null;
      },
      showScroll: showIndicator,
      scrollText: `  \u2014 ${taskOffset + 1}-${taskOffset + _taskRows} / ${taskTotal} \u2014`,
    }),
    React.createElement(Box, { height: 1 }),
    // 日志面板
    logs.length > 0 && (() => {
      const total = logs.length;
      let visible = Math.max(MIN_LOG_VISIBLE, _TH - 3 - _taskRows - 3);
      const logScroll = total > visible;
      if (logScroll) {
        // 滚动指示器占用 1 行，从内容中扣除
        visible = Math.max(MIN_SCROLL_CONTENT, visible - 1);
      }
      logVisibleRef.current = visible;
      const taskAreaHeight = taskYBase - 1 + displayedRows.length;
      logPanelYStart.current = 1 + taskAreaHeight + 1;
      logPanelYEnd.current = logPanelYStart.current + 2 + visible + (logScroll ? 1 : 0);
      taskPanelYStart.current = taskYBase;
      taskPanelYEnd.current = taskYBase + displayedRows.length - 1 + (showIndicator ? 1 : 0);
      const clampedOffset = Math.min(scrollOffset, Math.max(0, total - visible));
      const start = total - visible - clampedOffset;
      return React.createElement(LogPanel, {
        logs, start, visible,
        selAnchor, selFocus,
        borderColor: 'cyan',
        flexGrow: true,
        hasScroll: logScroll,
        total,
      });
    })(),
  );
}
