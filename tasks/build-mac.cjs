const path = require('path');
const GEN_DIR = path.join(__dirname, '..');
const GEN_CMD = `node "${path.join(GEN_DIR, 'gen-icons.cjs')}"`;

module.exports = {
  id: 'build:mac',
  description: 'build mac',
  dependsOn: ['icon:generate:mac'],
  conflicts: ['resource:cargo-build'],
  run: { cmd: `${GEN_CMD} mac --phase=copy && tauri build` },
};
