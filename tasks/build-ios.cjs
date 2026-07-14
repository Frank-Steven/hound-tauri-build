const path = require('path');
const GEN_DIR = path.join(__dirname, '..');
const GEN_CMD = `node "${path.join(GEN_DIR, 'gen-icons.cjs')}"`;

module.exports = {
  id: 'build:ios',
  description: 'build ios',
  dependsOn: ['icon:generate:ios', 'ios:init'],
  conflicts: ['resource:cargo-build'],
  run: { cmd: `${GEN_CMD} ios --phase=copy && tauri ios build` },
};
