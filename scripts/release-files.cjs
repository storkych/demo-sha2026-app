const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { version } = require('../package.json');
const files = [
  `FlightArchive-Portable-${version}.exe`,
  `FlightArchive-macOS-${version}-universal.dmg`,
  `FlightArchive-macOS-${version}-universal.zip`,
];
if (process.env.RELEASE_TAG !== `v${version}`) throw new Error('Release tag/version mismatch.');
const sums = files.map(name => {
  const content = fs.readFileSync(path.join('release', name));
  if (content.length === 0) throw new Error(`Empty release file: ${name}`);
  return `${crypto.createHash('sha256').update(content).digest('hex')}  ${name}`;
});
fs.writeFileSync('release/SHA256SUMS.txt', sums.join('\n') + '\n');
console.log(`Verified all ${files.length} Windows/macOS files; SHA256SUMS.txt written.`);
