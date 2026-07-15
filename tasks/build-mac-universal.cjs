const path = require('path');
const CP = `node "${path.join(__dirname, '..', 'gen-icons.cjs')}"`;

module.exports = {
  id: 'build:mac-universal',
  description: 'build mac uni',
  dependsOn: ['icon:mac'],
  conflicts: ['resource:cargo-build'],
  run: { cmd: `${CP} mac --phase=copy && tauri build --target universal-apple-darwin` },
};
