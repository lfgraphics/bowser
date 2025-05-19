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
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
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
  console.log('⚙️ Setting up auto-updater...');

  setInterval(() => {
    console.log('⏱️ Checking for updates (interval)...');
    autoUpdater.checkForUpdates();
  }, 10 * 60 * 1000);

  autoUpdater.checkForUpdatesAndNotify();
  console.log('🔍 Initial update check fired.');

  autoUpdater.on('checking-for-update', () => {
    console.log('🛰️ Checking for update...');
  });
  autoUpdater.on('update-available', () => {
    console.log('⬇️ Update available!');
  });
  autoUpdater.on('update-not-available', () => {
    console.log('✅ No update available.');
  });
  autoUpdater.on('error', (error) => {
    console.error('🚨 Auto updater error:', error);
  });
  autoUpdater.on('update-downloaded', () => {
    console.log('📦 Update downloaded!');
    dialog
      .showMessageBox({
        type: 'info',
        buttons: ['Restart', 'Later'],
        title: 'Update Ready',
        message:
          'A new version has been downloaded. Restart the app to apply it.',
      })
      .then((result) => {
        if (result.response === 0) autoUpdater.quitAndInstall();
      });
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
  ipcMain.handle('check-tally-status', async () => await checkTallyStatus());

  createWindow();
  startBridgeServer();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
