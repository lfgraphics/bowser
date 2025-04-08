import { runSync } from '../sync/mongoSync.js';

runSync().then(() => {
    console.log("Sync completed.");
    process.exit(0);
}).catch(err => {
    console.error("Sync failed:", err);
    process.exit(1);
});
