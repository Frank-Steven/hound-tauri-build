/**
 * @file 任务树/任务列表共用组件
 * 封装了单任务行（TaskRow）、链式任务行 + 滚动指示器的渲染。
 */

import React from 'react';
import { Box, Text } from 'ink';
import { STATUS, STATUS_ICONS, STATUS_COLORS } from '../constants.mjs';
import TaskRow from './TaskRow.mjs';

/**
 * @param {object} p
 * @param {Array}  p.rows          已切片的可视行数组
 * @param {Array}  p.tasks         完整任务数组
 * @param {string} p.keyPrefix     React key 前缀（防止跨视图 key 冲突）
 * @param {function} [p.getTaskElapsed]  (idx) => number | null，传递给 TaskRow 作为 liveElapsed
 * @param {function} [p.getChainExtra]   (members, row, ri) => ReactElement | null
 * @param {boolean} p.showScroll    是否显示滚动指示器
 * @param {string}  p.scrollText    滚动指示器文本
 */
export default function TaskTree(p) {
  const {
    rows, tasks, keyPrefix,
    getTaskElapsed, getChainExtra,
    showScroll, scrollText,
  } = p;

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    ...rows.map((row, ri) => {
      if (row.indices.length === 1) {
        const idx = row.indices[0];
        const task = tasks[idx] || { status: STATUS.PENDING };
        return React.createElement(TaskRow, {
          key: `${keyPrefix}r${ri}`,
          task,
          liveElapsed: getTaskElapsed ? getTaskElapsed(idx) : null,
          prefix: row.prefix || null,
        });
      }
      const members = row.indices.map((i) => tasks[i] || { status: STATUS.PENDING, elapsed: null });
      const stepNodes = [];
      for (let s = 0; s < members.length; s++) {
        const m = members[s];
        const ic = STATUS_ICONS[m.status] || m.status;
        const sc = m.status === STATUS.PENDING ? 'grey' : (m.color || STATUS_COLORS[m.status] || 'white');
        if (s > 0) {
          stepNodes.push(React.createElement(Text, { key: `ar${ri}_${s}`, color: 'grey' }, ' \u2192 '));
        }
        stepNodes.push(React.createElement(Text, { key: `ic${ri}_${s}`, color: sc }, ic));
        stepNodes.push(React.createElement(Text, { key: `nm${ri}_${s}`, color: sc }, ` ${m.name}`));
      }
      const extra = getChainExtra ? getChainExtra(members, row, ri) : null;
      return React.createElement(
        Box, { key: `${keyPrefix}r${ri}` },
        row.prefix != null && React.createElement(Text, { color: 'grey' }, row.prefix),
        React.createElement(Text, null, '  '),
        ...stepNodes,
        extra,
      );
    }),
    showScroll && React.createElement(
      Box, null,
      React.createElement(Text, { color: 'grey' }, scrollText),
    ),
  );
}
