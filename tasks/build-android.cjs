const path = require('path');
const GEN_DIR = path.join(__dirname, '..');
const GEN_CMD = `node "${path.join(GEN_DIR, 'gen-icons.cjs')}"`;

module.exports = {
  id: 'build:android',
  description: 'build android',
  dependsOn: ['icon:generate:android', 'android:signing'],
  conflicts: ['resource:cargo-build'],
  run: { cmd: `${GEN_CMD} android --phase=copy && tauri android build` },
};
