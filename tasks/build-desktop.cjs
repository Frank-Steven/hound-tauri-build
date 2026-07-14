/**
 * @file build:desktop 元任务
 * @description 构建全部桌面平台（Windows + macOS + Linux）。
 * @module scripts/build/tasks/build-desktop
 */

module.exports = {
  id: 'build:desktop',
  description: 'build desktop all',
  dependsOn: [
    'build:win',
    'build:mac',
    'build:mac-universal',
    'build:linux',
  ],
};
