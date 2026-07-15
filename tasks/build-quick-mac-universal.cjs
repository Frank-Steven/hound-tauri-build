module.exports = {
  id: 'build-quick:mac-universal',
  description: 'build-quick mac-universal',
  dependsOn: [],
  conflicts: ['resource:cargo-build'],
  run: { cmd: 'tauri build --target universal-apple-darwin' },
};
