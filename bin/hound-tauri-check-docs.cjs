#!/usr/bin/env node
/**
 * @file hound-tauri-check-docs CLI
 * @description 文档链接检查，扫描 src/core 下 .md 文件的相对链接。
 *              设置 HOUND_BUILD_ROOT 为当前工作目录后委托 ci/check-doc-links.mjs。
 * @module hound-tauri-build/bin/hound-tauri-check-docs
 */

const { pathToFileURL } = require('url');
const path = require('path');

if (!process.env.HOUND_BUILD_ROOT) {
  process.env.HOUND_BUILD_ROOT = process.cwd();
}

import(pathToFileURL(path.join(__dirname, '..', 'ci', 'check-doc-links.mjs')).href)
  .catch(err => { console.error(err); process.exit(1); });
