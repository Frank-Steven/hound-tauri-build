/**
 * @file 日志面板共用组件
 * 封装了带边框、文本选择高亮、滚动指示器的日志面板。
 * 所有行统一渲染为 <Text>，不嵌套 <Box>，避免 Ink v4 协调器限制。
 */

import React from 'react';
import { Box, Text } from 'ink';
import { getLineHighlight, highlightRange, parseBullet, stripAnsi } from '../utils.mjs';

/**
 * @param {object} p
 * @param {string[]} p.logs          日志行数组
 * @param {number}  p.start          可视窗口起始索引
 * @param {number}  p.visible        可视行数
 * @param {{ lineIdx: number, col: number }|null} p.selAnchor
 * @param {{ lineIdx: number, col: number }|null} p.selFocus
 * @param {string}  p.borderColor    边框颜色
 * @param {boolean} [p.flexGrow]     是否 flexGrow
 * @param {boolean} p.hasScroll      是否显示滚动指示器
 * @param {number}  p.total          日志总数（用于滚动指示器显示）
 */
export default function LogPanel(p) {
  const {
    logs, start, visible,
    selAnchor, selFocus,
    borderColor, flexGrow,
    hasScroll, total,
  } = p;

  const windowLines = logs.slice(Math.max(0, start), start + visible);

  const boxProps = { flexDirection: 'column', borderStyle: 'round', borderColor };
  if (flexGrow) boxProps.flexGrow = 1;

  const children = [];

  for (let i = 0; i < windowLines.length; i++) {
    const line = windowLines[i];
    const lineIdx = start + i;
    const inSelection = selAnchor != null && selFocus != null
      && lineIdx >= Math.min(selAnchor.lineIdx, selFocus.lineIdx)
      && lineIdx <= Math.max(selAnchor.lineIdx, selFocus.lineIdx);

    if (inSelection) {
      const hl = getLineHighlight(lineIdx, selAnchor, selFocus);
      if (hl) {
        children.push(
          React.createElement(Text, { key: lineIdx },
            highlightRange(line, hl.startCol, hl.endCol),
          ),
        );
        continue;
      }
    }

    const bulletInfo = parseBullet(line);
    if (bulletInfo) {
      children.push(
        React.createElement(Text, { key: lineIdx },
          `\x1b[${bulletInfo.color}m\u25cf\x1b[0m \x1b[90m${stripAnsi(bulletInfo.rest)}\x1b[0m`,
        ),
      );
    } else {
      children.push(
        React.createElement(Text, { key: lineIdx, color: 'grey' }, stripAnsi(line)),
      );
    }
  }

  if (hasScroll) {
    children.push(
      React.createElement(Text, { key: '__scroll', color: 'grey' },
        `  \u2014 ${start + 1}-${Math.min(start + visible, total)} / ${total} \u2014`,
      ),
    );
  }

  return React.createElement(Box, boxProps, ...children);
}
