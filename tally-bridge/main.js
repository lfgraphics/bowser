import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import { checkTallyStatus } from './server/tallyStatus.js';
import { startBridgeServer } from './server/bridge.js';
import { runSync } from './sync/mongoSync.js';
import { startSyncScheduler, stopSyncScheduler } from './sync/syncScheduler.js';
import { addLog, getLogs, getNextSyncTime, setNextSyncTime } from './logger.js';
import { setMainWindow } from './windowManager.js';
import { autoUpdater } from 'electron-updater';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ========== Globals ==========
let mainWindow;
let autoSyncInterval = null;

// ========== Window Creation ==========
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    icon: join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
    center: true,
    darkTheme: true,
    titleBarOverlay: true,
    titleBarStyle: 'hidden',
  });

  setMainWindow(mainWindow);

  mainWindow.loadURL(
    isDev
      ? `file://${__dirname}/index.html`
      : `file://${join(__dirname, 'index.html')}`
  );

  mainWindow.on('closed', () => (mainWindow = null));
}

// ========== Auto-Updater Setup ==========
function setupAutoUpdater() {
  const repo = 'lfgraphics/bowser';
  const packageJson = JSON.parse(
    fs.readFileSync(resolve(__dirname, './package.json'), 'utf-8')
  );
  const version = packageJson.version;
  const platform = `${process.platform}-${process.arch}`;
  const feedURL = `https://update.electronjs.org/${repo}/${platform}/${version}`;

  autoUpdater.setFeedURL({ url: feedURL });

  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 10 * 60 * 1000); // every 10 minutes

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Update Ready',
      message: 'A new version has been downloaded. Restart the app to apply it.',
    }).then((result) => {
      if (result.response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto updater error:', error);
  });
}

// ========== IPC Handlers ==========
ipcMain.handle('run-manual-sync', async () => {
  addLog('Manual sync initiated.', 'info');
  try {
    await runSync(addLog);
    addLog('Manual sync completed.', 'info');
    return 'Manual sync successful';
  } catch (error) {
    addLog('Manual sync error: ' + error.message, 'ERROR');
    return 'Manual sync failed: ' + error.message;
  }
});

ipcMain.handle('get-sync-logs', async () => getLogs());

ipcMain.handle('get-next-sync-time', async () => getNextSyncTime());

ipcMain.handle('set-sync-interval', async (event, minutes) => {
  startSyncScheduler(minutes);
  return `Auto sync enabled every ${minutes} minutes`;
});

ipcMain.handle('stop-sync-interval', async () => {
  stopSyncScheduler();
  setNextSyncTime('Stopped');
  return 'Auto sync disabled';
});

// ========== App Ready Setup ==========
app.whenReady().then(() => {
  createWindow();
  startBridgeServer();
  setupAutoUpdater();

  ipcMain.handle('check-tally-status', async () => await checkTallyStatus());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
