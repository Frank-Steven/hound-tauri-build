const path = require('path');
const CP = `node "${path.join(__dirname, '..', 'gen-icons.cjs')}"`;

module.exports = {
  id: 'build:win',
  description: 'build win',
  dependsOn: ['icon:win'],
  conflicts: ['resource:cargo-build'],
  run: { cmd: `${CP} win --phase=copy && tauri build` },
};
