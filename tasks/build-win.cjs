const path = require('path');
const GEN_DIR = path.join(__dirname, '..');
const GEN_CMD = `node "${path.join(GEN_DIR, 'gen-icons.cjs')}"`;

module.exports = {
  id: 'build:win',
  description: 'build win',
  dependsOn: ['icon:generate:win'],
  conflicts: ['resource:cargo-build'],
  run: { cmd: `${GEN_CMD} win --phase=copy && tauri build` },
};
