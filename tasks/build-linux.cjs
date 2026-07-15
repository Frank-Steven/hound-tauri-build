const path = require('path');
const CP = `node "${path.join(__dirname, '..', 'gen-icons.cjs')}"`;

module.exports = {
  id: 'build:linux',
  description: 'build linux',
  dependsOn: ['icon:linux'],
  conflicts: ['resource:cargo-build'],
  run: { cmd: `${CP} linux --phase=copy && tauri build --target x86_64-unknown-linux-gnu` },
};
