const { contextBridge, ipcRenderer } = require('electron');
console.log('[Preload] preload.js starting (ESM)');

// Expose a secure API to the renderer process
contextBridge.exposeInMainWorld('bridge', {
  // Tally Status Methods
  checkTallyStatus: () => ipcRenderer.invoke('check-tally-status'),

  // Sync Methods
  runManualSync: () => ipcRenderer.invoke('run-manual-sync'),
  getSyncLogs: () => ipcRenderer.invoke('get-sync-logs'),
  getNextSyncTime: () => ipcRenderer.invoke('get-next-sync-time'),
  setSyncInterval: (minutes) => {
    // Validate input
    if (typeof minutes !== 'number' || minutes < 10) {
      return Promise.reject(new Error('Sync interval must be a number >= 10 minutes'));
    }
    return ipcRenderer.invoke('set-sync-interval', minutes);
  },
  stopSyncInterval: () => ipcRenderer.invoke('stop-sync-interval'),

  // Configuration Methods
  getLocalUri: () => ipcRenderer.invoke('get-local-uri'),
  setLocalUri: (uri) => {
    // Basic validation
    if (typeof uri !== 'string' || uri.trim() === '') {
      return Promise.reject(new Error('URI must be a non-empty string'));
    }
    return ipcRenderer.invoke('set-local-uri', uri);
  },

  // Application Methods
  reloadApp: () => ipcRenderer.invoke('reload-app'),

  // Event Listeners
  onRefreshLogs: (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    const listener = () => callback();
    ipcRenderer.on('refresh-logs', listener);
    // Return disposer function
    return () => ipcRenderer.removeListener('refresh-logs', listener);
  }
});
console.log('[Preload] bridge exposed (ESM)');