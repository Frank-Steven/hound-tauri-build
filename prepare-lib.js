#!/usr/bin/env node

/**
 * @file 发行前准备
 * @description 源文件已内置于包中，无需额外拷贝。保留此钩子以供将来使用。
 * @module hound-tauri-build/prepare-lib
 */

// 所有构建脚本和 CI 脚本已直接内置于包根目录下。
// 不再需要从外部 scripts/build/ 或 scripts/ci/ 拷贝。
console.log("[hound-tauri-build] prepare-lib: nothing to copy, all files are in-tree.");
