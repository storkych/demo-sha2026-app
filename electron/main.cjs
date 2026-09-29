const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const dataDir = process.env.PORTABLE_EXECUTABLE_DIR || (app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath());
app.setPath('userData', path.join(dataDir, 'FlightArchiveData'));
const savePath = path.join(dataDir, 'quest-progress.json');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  ipcMain.handle('progress:read', () => { try { return JSON.parse(fs.readFileSync(savePath, 'utf8')); } catch { return null; } });
  ipcMain.handle('progress:write', (_event, value) => {
    if (!value || typeof value !== 'object' || JSON.stringify(value).length > 10000) throw new Error('Invalid progress');
    fs.writeFileSync(savePath + '.tmp', JSON.stringify(value), 'utf8');
    fs.renameSync(savePath + '.tmp', savePath);
  });
  let win;
  app.whenReady().then(() => {
    win = new BrowserWindow({ show: !process.argv.includes('--smoke-test'), width: 1440, height: 900, minWidth: 850, minHeight: 600, backgroundColor: '#10171b', autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', event => event.preventDefault());
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  });
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.on('window-all-closed', () => app.quit());
}
