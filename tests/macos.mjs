import { _electron as electron } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

assert.equal(process.platform, 'darwin', 'Run this distribution test on macOS.');
assert.ok(process.env.CI, 'The default-profile persistence test requires a clean CI Mac.');
const { version } = JSON.parse(await fs.readFile('package.json', 'utf8'));
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'flight-archive-mac-'));
const prefix = path.resolve(`release/FlightArchive-macOS-${version}-universal`);
execFileSync('ditto', ['-x', '-k', prefix + '.zip', path.join(dir, 'unzipped')]);
const binary = bundle => path.join(bundle, 'Contents/MacOS/Flight Archive');
const zippedApp = path.join(dir, 'unzipped/Flight Archive.app');
const arches = execFileSync('lipo', ['-archs', binary(zippedApp)], { encoding: 'utf8' }).trim().split(/\s+/);
assert.deepEqual(arches.sort(), ['arm64', 'x86_64']);
execFileSync('codesign', ['--verify', '--deep', '--strict', zippedApp]);

const mount = path.join(dir, 'mounted');
await fs.mkdir(mount);
const dataDir = path.join(os.homedir(), 'Library/Application Support/FlightArchive');
const save = path.join(dataDir, 'quest-progress.json');
assert.equal(await fs.access(save).then(() => true, () => false), false, 'CI profile must have no existing game progress.');
let mounted = false;
let app;
try {
  execFileSync('hdiutil', ['attach', '-readonly', '-nobrowse', '-mountpoint', mount, prefix + '.dmg']);
  mounted = true;
  const env = { ...process.env };
  delete env.FLIGHT_ARCHIVE_DATA_DIR;
  delete env.PORTABLE_EXECUTABLE_DIR;
  const options = { executablePath: binary(path.join(mount, 'Flight Archive.app')), args: ['--smoke-test'], env };
  app = await electron.launch(options);
  let page = await app.firstWindow();
  await page.getByRole('heading', { name: 'Доступ к системе' }).waitFor();
  assert.equal(await app.evaluate(({ app }) => app.getPath('userData')), path.join(dataDir, 'FlightArchiveData'));
  await page.getByRole('button', { name: 'Войти в систему' }).click();
  await page.locator('video').waitFor();
  await page.waitForFunction(async () => (await window.questStorage.read())?.phase === 'video');
  assert.equal(JSON.parse(await fs.readFile(save, 'utf8')).phase, 'video');
  await app.close();
  // The ZIP and DMG distributions share progress outside either app bundle.
  app = await electron.launch({ ...options, executablePath: binary(zippedApp) });
  page = await app.firstWindow();
  await page.locator('video').waitFor();
  assert.equal(await page.locator('.backdrop').evaluate(e => getComputedStyle(e).backgroundImage.includes('cockpit.png')), true);
  console.log('macOS passed: Intel+Apple Silicon binaries, signature, read-only DMG launch, writable user progress, ZIP resumes the same game.');
} finally {
  await app?.close().catch(() => {});
  if (mounted) execFileSync('hdiutil', ['detach', mount]);
}
