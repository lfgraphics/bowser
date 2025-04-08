import { app, BrowserWindow, ipcMain } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import { checkTallyStatus } from './server/tallyStatus.js';
import { startBridgeServer } from './server/bridge.js';
import { runSync } from './sync/mongoSync.js';
import { startSyncScheduler, stopSyncScheduler } from './sync/syncScheduler.js';
import { addLog, getLogs, getNextSyncTime, setNextSyncTime } from './logger.js';
import { setMainWindow } from './windowManager.js';

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
    icon: join(__dirname, 'assets', 'icon.ico'), // or icon.ico if on Windows
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

// ========== Logging System with Levels ==========
function stopSyncInterval() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    setNextSyncTime(null);
    addLog('Auto sync stopped.', 'WARN');
  }
}

// function setSyncInterval() {
//   stopSyncInterval();
//   addLog('Auto sync started.');
//   autoSyncInterval = setInterval(async () => {
//     try {
//       const now = new Date();
//       addLog('Auto sync started at: ' + now.toLocaleTimeString());
//       setNextSyncTime(new Date(now.getTime() + 3600 * 1000));
//       await runSync(addLog);
//       addLog('Auto sync completed at: ' + new Date().toLocaleTimeString());
//     } catch (err) {
//       addLog('Auto sync error: ' + err.message, 'ERROR');
//     }
//   }, 3600 * 1000);

//   const firstRun = new Date();
//   setNextSyncTime(new Date(firstRun.getTime() + 3600 * 1000));
//   const currNextsynctime = getNextSyncTime();
//   addLog('Auto sync interval started (every 1 hour). Next at: ' + currNextsynctime.toLocaleTimeString());
// }

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

// ipcMain.handle('stop-sync-interval', async () => {
//   stopSyncInterval();
//   setNextSyncTime('Stopped');
//   return 'Auto sync disabled';
// });

ipcMain.handle('stop-sync-interval', async () => {
  stopSyncScheduler();
  setNextSyncTime('Stopped');
  return 'Auto sync disabled';
});

// ========== App Ready Setup ==========
app.whenReady().then(() => {
  createWindow();

  startBridgeServer();

  ipcMain.handle('check-tally-status', async () => await checkTallyStatus());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});