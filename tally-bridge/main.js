import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import isDev from 'electron-is-dev';
import getPort from 'get-port';
import { checkTallyStatus } from './server/tallyStatus.js';
import { startBridgeServer } from './server/bridge.js';
import { runSync } from './sync/mongoSync.js';
import { startSyncScheduler, stopSyncScheduler } from './sync/syncScheduler.js';
import { addLog, getLogs, getNextSyncTime, setNextSyncTime } from './logger.js';
import { setMainWindow } from './windowManager.js';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import fs from 'fs';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ========== Globals ==========
let mainWindow;
let autoSyncInterval = null;
let nextjsServer = null;

// ========== Next.js Server Management ==========
async function startNextjsServer() {
  // Better dev detection: check if we're packaged OR if NODE_ENV is production
  const isDevMode = isDev && process.env.NODE_ENV !== 'production' && !app.isPackaged;
  
  console.log('🔍 Environment detection:');
  console.log('  - isDev:', isDev);
  console.log('  - process.env.NODE_ENV:', process.env.NODE_ENV);
  console.log('  - app.isPackaged:', app.isPackaged);
  console.log('  - isDevMode (final):', isDevMode);
  
  if (isDevMode) {
    // In development, Next.js dev server runs separately on port 3000
    const maxRetries = 30;
    let retries = 0;
    const devPort = process.env.ELECTRON_NEXT_PORT ? Number(process.env.ELECTRON_NEXT_PORT) : 3000;
    const devUrl = `http://localhost:${devPort}`;

    while (retries < maxRetries) {
      try {
        await axios.get(devUrl);
        console.log(`✅ Next.js dev server is ready at ${devUrl}`);
        return devUrl;
      } catch (error) {
        retries++;
        console.log(`⏳ Waiting for Next.js dev server on ${devUrl}... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Next.js dev server failed to start');
  } else {
    // In production, spawn Next.js standalone server
    const preferredPorts = Array.from({ length: 101 }, (_, i) => 3000 + i);
    const port = await getPort({ port: preferredPorts });
    // Probe known packager layouts for the Next.js standalone output
    const candidates = [
      join(process.resourcesPath, '.next', 'standalone'),
      join(process.resourcesPath, 'standalone'),
      join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone'),
      join(process.resourcesPath, 'app.asar.unpacked', 'standalone'),
      join(__dirname, '.next', 'standalone'),
    ];

    let chosenStandalonePath = null;
    for (const p of candidates) {
      try {
        if (fs.existsSync(join(p, 'server.js'))) {
          chosenStandalonePath = p;
          console.log(`✅ Found Next.js standalone server at: ${p}`);
          break;
        }
      } catch {}
    }

    // Also check if we need to create a symlink or copy static files
    if (chosenStandalonePath) {
      const staticPath = join(chosenStandalonePath, '.next', 'static');
      // Try multiple locations for static files
      const staticCandidates = [
        join(process.resourcesPath, '.next', 'static'),
        join(process.resourcesPath, 'static'),
      ];
      
      let resourcesStaticPath = null;
      for (const candidate of staticCandidates) {
        if (fs.existsSync(candidate)) {
          resourcesStaticPath = candidate;
          console.log(`📁 Found static files at: ${candidate}`);
          break;
        }
      }
      
      if (!fs.existsSync(staticPath) && resourcesStaticPath) {
        console.log('📁 Linking static files for standalone server...');
        console.log(`  From: ${resourcesStaticPath}`);
        console.log(`  To: ${staticPath}`);
        // Ensure .next directory exists in standalone
        const nextDir = join(chosenStandalonePath, '.next');
        if (!fs.existsSync(nextDir)) {
          fs.mkdirSync(nextDir, { recursive: true });
        }
        // Create junction/symlink to static files
        try {
          fs.symlinkSync(resourcesStaticPath, staticPath, 'junction');
          console.log('✅ Static files linked successfully');
        } catch (error) {
          console.warn('⚠️  Could not create static symlink:', error.message);
          // Try copying instead of symlinking
          try {
            const copyRecursiveSync = (src, dest) => {
              if (fs.statSync(src).isDirectory()) {
                if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
                fs.readdirSync(src).forEach(file => {
                  copyRecursiveSync(join(src, file), join(dest, file));
                });
              } else {
                fs.copyFileSync(src, dest);
              }
            };
            copyRecursiveSync(resourcesStaticPath, staticPath);
            console.log('✅ Static files copied successfully');
          } catch (copyError) {
            console.error('❌ Failed to copy static files:', copyError.message);
          }
        }
      } else if (fs.existsSync(staticPath)) {
        console.log('✅ Static files already exist in standalone directory');
      } else if (!resourcesStaticPath) {
        console.warn('⚠️  No static files found to link');
      }
    }

    const standaloneServerPath = chosenStandalonePath ? join(chosenStandalonePath, 'server.js') : '';

    console.log('🔍 Debug paths:');
    console.log('  - process.resourcesPath:', process.resourcesPath);
    console.log('  - __dirname:', __dirname);
    console.log('  - chosenStandalonePath:', chosenStandalonePath);
    console.log('  - standaloneServerPath:', standaloneServerPath);
    console.log('  - server.js exists:', fs.existsSync(standaloneServerPath));

    if (!fs.existsSync(standaloneServerPath)) {
      // List contents of process.resourcesPath for debugging
      try {
        console.log('📁 Contents of process.resourcesPath:', fs.readdirSync(process.resourcesPath));
        if (fs.existsSync(join(process.resourcesPath, 'standalone'))) {
          console.log('📁 Contents of standalone dir:', fs.readdirSync(join(process.resourcesPath, 'standalone')));
        }
      } catch (e) {
        console.log('❌ Error listing directories:', e.message);
      }
      throw new Error('Next.js standalone server not found. Run "npm run build:next" first.');
    }

    // Spawn using Electron binary as Node to avoid relying on system 'node'
    nextjsServer = spawn(process.execPath, ['server.js'], {
      cwd: chosenStandalonePath,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: port.toString() },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    nextjsServer.stdout.on('data', (data) => {
      console.log(`[Next.js] ${data}`);
    });

    nextjsServer.stderr.on('data', (data) => {
      console.error(`[Next.js Error] ${data}`);
    });

    // Wait for server to be ready
    const maxRetries = 30;
    let retries = 0;
    const url = `http://localhost:${port}`;

    while (retries < maxRetries) {
      try {
        await axios.get(url);
        console.log(`✅ Next.js server is ready at ${url}`);
        return url;
      } catch (error) {
        retries++;
        console.log(`⏳ Waiting for Next.js server... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Next.js server failed to start');
  }
}

// ========== Window Creation ==========
async function createWindow() {
  try {
    const nextjsUrl = await startNextjsServer();

    const isWindows = process.platform === 'win32';
    mainWindow = new BrowserWindow({
      width: 900,
      height: 700,
      icon: join(__dirname, 'assets', 'icon.ico'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js')
      },
      autoHideMenuBar: true,
      center: true,
      darkTheme: true,
      // Use framed window to ensure system controls are available
    });

    setMainWindow(mainWindow);

    await mainWindow.loadURL(nextjsUrl);

    mainWindow.on('closed', () => {
      mainWindow = null;
      // Clean up Next.js server in production
      if (nextjsServer && !nextjsServer.killed) {
        nextjsServer.kill();
      }
    });
  } catch (error) {
    console.error('❌ Failed to create window:', error);
    dialog.showErrorBox('Startup Error', `Failed to start the application: ${error.message}`);
    app.quit();
  }
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

ipcMain.handle('get-next-sync-time', async () => {
  const nextSync = getNextSyncTime();
  return typeof nextSync === 'string' ? nextSync : nextSync?.toString() || 'Not Scheduled';
});

ipcMain.handle('set-sync-interval', async (event, minutes) => {
  startSyncScheduler(minutes);
  return `Auto sync enabled every ${minutes} minutes`;
});

ipcMain.handle('stop-sync-interval', async () => {
  stopSyncScheduler();
  setNextSyncTime('Stopped');
  return 'Auto sync disabled';
});

const envFilePath = isDev ? join(__dirname, '.env') : join(process.resourcesPath, 'env.production');

ipcMain.handle('get-local-uri', async () => {
  try {
    // Use the config system to get the current local URI
    const { getConfig } = await import('./sync/config.js');
    const localUri = getConfig('localUri') || process.env.localUri || 'mongodb://localhost:27017';
    addLog(`Bridge API: Retrieved local URI: ${localUri}`);
    return localUri;
  } catch (error) {
    addLog(`Bridge API: Error getting local URI: ${error.message}`, 'ERROR');
    return 'mongodb://localhost:27017';
  }
});

ipcMain.handle('set-local-uri', async (event, newUri) => {
  try {
    // Use the config system to save the new local URI
    const { saveConfig } = await import('./sync/config.js');
    const { updateLocalUri } = await import('./sync/mongoSync.js');
    
    addLog(`Bridge API: Setting local URI to: ${newUri}`);
    
    // Save to config file and update MongoDB connection
    const configSaved = saveConfig({ localUri: newUri });
    if (configSaved) {
      const mongoUpdated = await updateLocalUri(newUri);
      if (mongoUpdated) {
        addLog(`Bridge API: Successfully updated local URI and MongoDB connection`);
        return { success: true };
      } else {
        addLog(`Bridge API: Config saved but MongoDB update failed`, 'ERROR');
        return { success: false, error: 'Failed to update MongoDB connection' };
      }
    } else {
      addLog(`Bridge API: Failed to save config`, 'ERROR');
      return { success: false, error: 'Failed to save configuration' };
    }
  } catch (error) {
    addLog(`Bridge API: Error setting local URI: ${error.message}`, 'ERROR');
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reload-app', () => {
  app.relaunch();
  app.exit();
});

// ========== App Ready Setup ==========
app.whenReady().then(() => {
  ipcMain.handle('check-tally-status', async () => await checkTallyStatus());

  createWindow();
  startBridgeServer();
  addLog('Application started', 'info');
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Clean up Next.js server process
  if (nextjsServer && !nextjsServer.killed) {
    nextjsServer.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});
