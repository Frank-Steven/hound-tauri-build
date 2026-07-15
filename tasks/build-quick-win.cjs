module.exports = {
  id: 'build-quick:win',
  description: 'build-quick win',
  dependsOn: [],
  conflicts: ['resource:cargo-build'],
  run: { cmd: 'tauri build --bundles nsis msi' },
};
