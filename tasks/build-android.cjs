const path = require('path');
const CP = `node "${path.join(__dirname, '..', 'gen-icons.cjs')}"`;

module.exports = {
  id: 'build:android',
  description: 'build android',
  dependsOn: ['icon:android', 'android:signing'],
  conflicts: ['resource:cargo-build'],
  run: { cmd: `${CP} android --phase=copy && tauri android build` },
};
