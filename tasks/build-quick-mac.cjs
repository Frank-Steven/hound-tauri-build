module.exports = {
  id: 'build-quick:mac',
  description: 'build-quick mac',
  dependsOn: [],
  conflicts: ['resource:cargo-build'],
  run: { cmd: 'tauri build --bundles dmg app' },
};
