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
const platform = process.argv[2] || (process.platform === 'darwin' ? 'mac' : 'win');
if (!['mac', 'win'].includes(platform)) throw new Error('Choose mac or win as the packaging platform.');
const mac = platform === 'mac';
build({
  targets: mac
    ? Platform.MAC.createTarget(['dmg', 'zip'], Arch.universal)
    : Platform.WINDOWS.createTarget('portable', Arch.x64),
  publish: 'never',
  // A universal Mac app needs both Electron architectures, not the host-only runtime.
  config: !mac && installedVersion === version ? { electronDist } : {},
}).catch(error => { console.error(error); process.exitCode = 1; });
