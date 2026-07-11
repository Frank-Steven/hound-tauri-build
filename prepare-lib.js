/**
 * @file 发布前准备
 * @description 将 scripts/build/ 下的源文件拷贝到包根目录，
 *              使 npm 包自包含，不依赖 monorepo 相对路径。
 * @module hound-tauri-build/prepare-lib
 */

const fs = require('fs');
const path = require('path');

const PKG_DIR = __dirname;
const SRC_BUILD = path.join(__dirname, '..', 'build');
const SRC_CI = path.join(__dirname, '..', 'ci');

/** 需要拷贝的源文件 → 目标路径（相对于 PKG_DIR） */
const COPIES = [
  // 核心脚本
  { src: path.join(SRC_BUILD, 'task-runner.cjs'),      dest: 'task-runner.cjs' },
  { src: path.join(SRC_BUILD, 'build-entry.cjs'),      dest: 'build-entry.cjs' },
  { src: path.join(SRC_BUILD, 'clean.cjs'),            dest: 'clean.cjs' },
  { src: path.join(SRC_BUILD, 'gen-icons.cjs'),        dest: 'gen-icons.cjs' },
  { src: path.join(SRC_BUILD, 'copy-keystore.cjs'),    dest: 'copy-keystore.cjs' },
  { src: path.join(SRC_BUILD, 'icon-config.json'),     dest: 'icon-config.json' },
];

/**
 * 递归拷贝目录
 * @param {string} srcDir - 源目录
 * @param {string} destDir - 目标目录
 */
function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

// 拷贝单文件
for (const { src, dest } of COPIES) {
  if (!fs.existsSync(src)) {
    console.warn(`prepare-lib: source not found, skipping: ${path.relative(PKG_DIR, src)}`);
    continue;
  }
  const destPath = path.join(PKG_DIR, dest);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(src, destPath);
  console.log(`prepare-lib: copied ${path.relative(PKG_DIR, src)} → ${dest}`);
}

// 拷贝目录
copyDir(path.join(SRC_BUILD, 'tasks'), path.join(PKG_DIR, 'tasks'));
console.log('prepare-lib: copied tasks/');
copyDir(path.join(SRC_BUILD, 'tui-app'), path.join(PKG_DIR, 'tui-app'));
console.log('prepare-lib: copied tui-app/');
copyDir(SRC_CI, path.join(PKG_DIR, 'ci'));
console.log('prepare-lib: copied ci/');

console.log('prepare-lib: done');
