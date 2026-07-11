/**
 * @file 错误边界
 */

import React from 'react';
import { safeExit } from '../utils.mjs';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) {
    process.stderr.write('TUI Error: ' + error.message + '\n' + error.stack + '\n');
    safeExit(1);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
