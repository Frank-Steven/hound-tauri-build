/**
 * @file ios:init 任务
 * @description 初始化 iOS 项目。
 * @module scripts/build/tasks/ios-init
 */

module.exports = {
  id: 'ios:init',
  description: 'ios init',
  dependsOn: [],
  conflicts: ['resource:tauri-cli'],
  run: { cmd: 'node -e "require(\'fs\').rmSync(\'src-tauri/gen/ios\',{recursive:true,force:true})" && yarn init:ios' },
};
