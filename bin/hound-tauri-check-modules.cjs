#!/usr/bin/env node
/**
 * @file hound-tauri-check-modules CLI
 * @description 文件头路径检查，扫描 src/core 下 .js 文件的 @module 路径。
 *              设置 HOUND_BUILD_ROOT 为当前工作目录后委托 ci/check-module-paths.mjs。
 * @module hound-tauri-build/bin/hound-tauri-check-modules
 */

const { pathToFileURL } = require('url');
const path = require('path');

if (!process.env.HOUND_BUILD_ROOT) {
  process.env.HOUND_BUILD_ROOT = process.cwd();
}

import(pathToFileURL(path.join(__dirname, '..', 'ci', 'check-module-paths.mjs')).href)
  .catch(err => { console.error(err); process.exit(1); });
