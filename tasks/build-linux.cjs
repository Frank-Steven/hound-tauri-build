const path = require('path');
const GEN_DIR = path.join(__dirname, '..');
const GEN_CMD = `node "${path.join(GEN_DIR, 'gen-icons.cjs')}"`;

module.exports = {
  id: 'build:linux',
  description: 'build linux',
  dependsOn: ['icon:generate:linux'],
  conflicts: ['resource:cargo-build'],
  run: { cmd: `${GEN_CMD} linux --phase=copy && tauri build` },
};
