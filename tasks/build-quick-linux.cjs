module.exports = {
  id: 'build-quick:linux',
  description: 'build-quick linux',
  dependsOn: [],
  conflicts: ['resource:cargo-build'],
  run: { cmd: 'tauri build --bundles deb appimage rpm' },
};
