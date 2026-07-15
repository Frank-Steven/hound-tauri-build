module.exports = {
  id: 'build-quick:desktop',
  description: 'build-quick desktop',
  dependsOn: [],
  conflicts: ['resource:cargo-build'],
  run: { cmd: 'tauri build' },
};
