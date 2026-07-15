module.exports = {
  id: 'build-quick:ios',
  description: 'build-quick ios',
  dependsOn: [],
  conflicts: ['resource:cargo-build'],
  run: { cmd: 'tauri ios build' },
};
