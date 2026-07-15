module.exports = {
  id: 'build-quick:android',
  description: 'build-quick android',
  dependsOn: [],
  conflicts: ['resource:cargo-build'],
  run: { cmd: 'tauri android build' },
};
