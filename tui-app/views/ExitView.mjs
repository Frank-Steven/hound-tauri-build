/**
 * @file 结算视图（构建完成总结页）
 */

import React from 'react';
import { Box, Text } from 'ink';
import { MIN_TASK, MIN_LOG_VISIBLE, LOG_BORDER, MIN_SCROLL } from '../constants.mjs';
import LogPanel from '../components/LogPanel.mjs';
import TaskTree from '../components/TaskTree.mjs';

/**
 * @param {object} p
 * @param {number} p._TH
 * @param {import('../index.mjs').Task[]} p.tasks
 * @param {string[]} p.logs
 * @param {number} p.scrollOffset
 * @param {number} p.done
 * @param {number} p.failed
 * @param {number} p.skipped
 * @param {number} p.total
 * @param {boolean} p.ok
 * @param {boolean} p.hasError
 * @param {number} p._exitRowCnt
 * @param {Array} p.allRows
 * @param {number} p.taskScrollOffset
 * @param {{ current: number }} p.logVisibleRef
 * @param {{ current: number }} p.logPanelYStart
 * @param {{ current: number }} p.logPanelYEnd
 * @param {{ current: number }} p.taskPanelYStart
 * @param {{ current: number }} p.taskPanelYEnd
 * @param {{ current: number }} p.taskTotalRef
 * @param {{ current: number }} p.taskVisibleRef
 * @returns {React.ReactElement}
 */
export default function ExitView(p) {
  const {
    _TH, tasks, scrollOffset,
    done, failed, skipped, total, ok, hasError,
    _exitRowCnt, allRows, taskScrollOffset,
    logVisibleRef, logPanelYStart, logPanelYEnd,
    taskPanelYStart, taskPanelYEnd,
    taskTotalRef, taskVisibleRef,
    logs,
    selAnchor, selFocus,
  } = p;

  // 任务列表 + 滚动指示
  const taskScroll = allRows.length > _exitRowCnt ? MIN_SCROLL : 0;
  taskTotalRef.current = allRows.length;
  taskVisibleRef.current = _exitRowCnt;

  const exitOffset = Math.min(taskScrollOffset, Math.max(0, allRows.length - _exitRowCnt));
  const exitDisplayed = allRows.slice(exitOffset, exitOffset + _exitRowCnt);

  // 错误日志面板空间计算
  // Fixed rows: banner(1) + stats(1) + spacer after stats(1) + spacer before tasks(1) + hint(1) = 5
  // Task section: _exitRowCnt + taskScroll
  // Remaining for error box + bottom flex = _TH - 5 - (_exitRowCnt + taskScroll)
  // Error box = border(2) + inner + scroll(0|1), bottom flex fills leftover
  let errorInner = 0;
  let errorScroll = 0;
  let errorBoxH = 0;
  let bottomFlex = 1;

  if (hasError) {
    const taskVisual = _exitRowCnt + taskScroll;
    // Allocate ~85% of remaining to error box, ~15% to bottom flex, minimum 1 for flex
    errorBoxH = Math.max(LOG_BORDER + MIN_LOG_VISIBLE, Math.floor((_TH - 5 - taskVisual) * 0.85));
    const errorBorder = LOG_BORDER;
    let errorInnerMax = errorBoxH - errorBorder;
    errorInner = Math.min(logs.length, errorInnerMax);
    errorScroll = logs.length > errorInner ? 1 : 0;
    if (errorScroll) {
      errorInner = Math.min(logs.length, Math.max(3, errorInnerMax - 1));
    }
    // Recompute actual error box height after adjustment
    errorBoxH = errorBorder + errorInner + errorScroll;
    // Bottom flex = remaining
    bottomFlex = _TH - 5 - errorBoxH - taskVisual;
    if (bottomFlex < 0) {
      // Emergency fallback: reduce error inner to fit
      errorInner = Math.max(3, errorInner + bottomFlex);
      errorBoxH = errorBorder + errorInner + errorScroll;
      bottomFlex = _TH - 5 - errorBoxH - taskVisual;
      if (bottomFlex < 0) bottomFlex = 0;
    }
  }

  // Y 坐标记录（鼠标滚轮定位用）
  if (hasError) {
    logVisibleRef.current = errorInner;
    logPanelYStart.current = 4;
    logPanelYEnd.current = 4 + errorBoxH - 1;
    taskPanelYStart.current = 4 + errorBoxH + 1;
    taskPanelYEnd.current = taskPanelYStart.current + _exitRowCnt - 1 + taskScroll;
  } else {
    logVisibleRef.current = 0;
    logPanelYStart.current = 0;
    logPanelYEnd.current = 0;
    taskPanelYStart.current = 4;
    taskPanelYEnd.current = taskPanelYStart.current + _exitRowCnt - 1 + taskScroll;
  }

  return React.createElement(
    Box,
    { flexDirection: 'column', height: _TH, overflow: 'hidden' },

    // ---- 结果横幅 ----
    React.createElement(
      Box, null,
      React.createElement(
        Text,
        { backgroundColor: ok ? 'green' : 'red', color: 'white', bold: true },
        ok ? '  BUILD SUCCEEDED  ' : '  BUILD FAILED  ',
      ),
    ),

    // ---- 统计 ----
    React.createElement(
      Box, null,
      React.createElement(
        Text, { color: 'grey' },
        `  ${done} done  ${failed} failed  ${skipped} skipped  ${total} total`,
      ),
    ),
    React.createElement(Box, { height: 1 }),

    // ---- 错误日志 ----
    hasError && (() => {
      const t = logs.length;
      const clampedOffset = Math.min(scrollOffset, Math.max(0, t - errorInner));
      const start = t - errorInner - clampedOffset;
      return React.createElement(LogPanel, {
        logs, start, visible: errorInner,
        selAnchor, selFocus,
        borderColor: 'red',
        hasScroll: errorScroll,
        total: t,
      });
    })(),

    // ---- 空行分隔 ----
    React.createElement(Box, { height: 1 }),

    // ---- 任务终态列表 ----
    React.createElement(TaskTree, {
      rows: exitDisplayed, tasks, keyPrefix: 'e',
      showScroll: taskScroll,
      scrollText: `  \u2014 ${exitOffset + 1}-${Math.min(exitOffset + _exitRowCnt, allRows.length)} / ${allRows.length} \u2014`,
    }),

    // ---- 底部弹性空间 ----
    React.createElement(Box, { flexGrow: 1, height: bottomFlex }),

    // ---- 退出提示 ----
    React.createElement(
      Box, null,
      React.createElement(Text, { color: 'grey' }, '  Press Esc or Enter to exit'),
    ),
  );
}
