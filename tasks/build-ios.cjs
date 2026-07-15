const path = require('path');
const CP = `node "${path.join(__dirname, '..', 'gen-icons.cjs')}"`;

module.exports = {
  id: 'build:ios',
  description: 'build ios',
  dependsOn: ['icon:ios', 'ios:init'],
  conflicts: ['resource:cargo-build'],
  run: { cmd: `${CP} ios --phase=copy && tauri ios build` },
};
