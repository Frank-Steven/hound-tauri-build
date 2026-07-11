/**
 * @file 终端过小提示页
 */

import React from 'react';
import { Box, Text } from 'ink';
import { MIN_ROWS, MIN_COLS } from '../constants.mjs';

export default function SizeWarning({ terminalHeight, terminalWidth }) {
  const TH = terminalHeight || 24;
  const TW = terminalWidth || 80;
  return React.createElement(
    Box, { flexDirection: 'column', height: TH, alignItems: 'center', justifyContent: 'center' },
    React.createElement(Text, { color: 'yellow', bold: true }, '  Terminal too small  '),
    React.createElement(Box, { height: 1 }),
    React.createElement(
      Text, { color: 'grey' },
      `  Current: ${TH}\u00d7${TW}  |  Minimum: ${MIN_ROWS}\u00d7${MIN_COLS}  `,
    ),
    React.createElement(Box, { height: 1 }),
    React.createElement(Text, { color: 'grey' }, '  Please resize your terminal and restart  '),
  );
}
