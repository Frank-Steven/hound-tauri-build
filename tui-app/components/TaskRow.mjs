/**
 * @file 任务行组件
 */

import React from 'react';
import { Box, Text } from 'ink';
import { STATUS, STATUS_ICONS, STATUS_COLORS } from '../constants.mjs';
import { formatElapsed } from '../utils.mjs';

export default function TaskRow({ task, liveElapsed, prefix }) {
  const icon = STATUS_ICONS[task.status] || task.status;
  const color = task.status === STATUS.PENDING
    ? 'grey'
    : (task.color || STATUS_COLORS[task.status] || 'white');

  const elapsedText = task.status === STATUS.RUNNING && liveElapsed != null
    ? formatElapsed(liveElapsed)
    : task.elapsed != null && task.status === STATUS.DONE
      ? formatElapsed(task.elapsed)
      : null;

  return React.createElement(
    Box,
    null,
    prefix != null && React.createElement(Text, { color: 'grey' }, prefix),
    React.createElement(Text, { color }, `  ${icon}  ${task.name}`),
    elapsedText != null
      && React.createElement(Text, { color: task.status === STATUS.RUNNING ? color : 'grey' }, `  ${elapsedText}`),
    task.status === STATUS.FAILED && React.createElement(Text, { color: 'red' }, '  FAILED'),
  );
}
