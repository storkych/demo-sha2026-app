// Avoid update checks during packaging; use the installed runtime when available.
process.env.NO_UPDATE_NOTIFIER = '1';
const fs = require('node:fs');
const path = require('node:path');
const { build, Platform, Arch } = require('electron-builder');
const electronDist = path.resolve('node_modules/electron/dist');
const version = require('electron/package.json').version;
const installedVersion = fs.existsSync(path.join(electronDist, 'version'))
  ? fs.readFileSync(path.join(electronDist, 'version'), 'utf8').trim().replace(/^v/, '')
  : null;
build({
  targets: Platform.WINDOWS.createTarget('portable', Arch.x64),
  config: installedVersion === version ? { electronDist } : {},
}).catch(error => { console.error(error); process.exitCode = 1; });
