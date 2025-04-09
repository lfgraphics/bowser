import { runSync } from './mongoSync.js';
import { addLog, setNextSyncTime, notifyRendererToRefreshLogs } from '../logger.js';

export let isSyncRunning = false;
export let stopRequested = false;
export let autoSyncTimer = null;

export async function startSyncScheduler(minutes = 60) {
    if (minutes < 10) {
        addLog("Sync interval must be at least 10 minutes.", "WARN");
        notifyRendererToRefreshLogs();
        return;
    }

    if (isSyncRunning) {
        addLog("Auto sync is already running.", "WARN");
        notifyRendererToRefreshLogs();
        return;
    }

    stopRequested = false;
    isSyncRunning = true;

    addLog(`Auto sync scheduled for every ${minutes} minutes.`);
    notifyRendererToRefreshLogs();

    const intervalMs = minutes * 60 * 1000;

    await runSync(addLog);

    while (!stopRequested) {
        try {
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();

            const isWithinWindow = hour >= 9 && hour <= 23;
            const minutesSince9AM = (hour - 9) * 60 + minute;
            const isCycleTime = isWithinWindow && minutesSince9AM % minutes === 0;

            if (isCycleTime) {
                try {
                    addLog(`🔄 Auto sync started at ${now.toLocaleTimeString()}`);
                    await runSync(addLog);
                    const nextSync = new Date(Date.now() + intervalMs);
                    setNextSyncTime(nextSync);
                    addLog(`✅ Auto sync completed at ${new Date().toLocaleTimeString()}`);
                    addLog(`🕒 Next sync scheduled for ${nextSync.toLocaleTimeString()}\n\n\n`);
                    notifyRendererToRefreshLogs();
                } catch (err) {
                    addLog("❌ Auto sync error: " + err.message, 'ERROR');
                    notifyRendererToRefreshLogs();
                }

                const waitUntil = new Date(Date.now() + intervalMs);
                const waitTime = waitUntil - new Date();
                await delay(waitTime);
            } else {
                const nextCycleMinutes = Math.ceil(minutesSince9AM / minutes) * minutes;
                let nextRun;

                if (!isWithinWindow || nextCycleMinutes >= 900) {
                    nextRun = new Date();
                    nextRun.setDate(nextRun.getDate() + 1);
                    nextRun.setHours(9, 0, 0, 0);
                } else {
                    const minutesToAdd = nextCycleMinutes - minutesSince9AM;
                    nextRun = new Date(Date.now() + minutesToAdd * 60 * 1000);
                    nextRun.setSeconds(0, 0);
                }

                const waitTime = nextRun - new Date();
                setNextSyncTime(nextRun);
                addLog(`⏱ Not in sync window. Waiting until ${nextRun.toLocaleTimeString()}`, 'INFO');
                notifyRendererToRefreshLogs();
                await delay(waitTime);
            }
        } catch (error) {
            addLog("Error in sync scheduler: " + error.message, 'ERROR');
            notifyRendererToRefreshLogs();
        }
    }

    isSyncRunning = false;
    setNextSyncTime("Stopped");
    addLog("✅ Auto sync scheduler stopped.", "WARN");
    notifyRendererToRefreshLogs();
}

// Reusable delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function stopSyncScheduler() {
    stopRequested = true;
}