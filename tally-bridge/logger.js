import { getMainWindow } from './windowManager.js';

let logs = [];
let nextSyncTime = null;

export function addLog(message, level = 'info') {
    const timestamp = new Date().toLocaleString();
    const entry = { timestamp, message, level: level.toUpperCase() };
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    logs.push(entry);
    if (logs.length > 100) logs.shift();
    // Notify renderer to refresh logs in real-time
    try {
        const win = getMainWindow();
        if (win) {
            win.webContents.send('refresh-logs');
        }
    } catch (e) {
        // ignore if window not ready
    }
}

export function getLogs() {
    return logs;
}

export function setNextSyncTime(date) {
    nextSyncTime = date;
}

export function getNextSyncTime() {
    return nextSyncTime;
}

export function clearLogs() {
    logs = [];
}

export function notifyRendererToRefreshLogs() {
    const win = getMainWindow();
    if (win) {
        win.webContents.send('refresh-logs');
    }
}

export default {
    addLog,
    getLogs,
    setNextSyncTime,
    getNextSyncTime,
    clearLogs
};
