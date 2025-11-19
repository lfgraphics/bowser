import express from 'express';
import { 
    findOne, 
    bulkWrite,
    countDocuments
} from '../../models/VehiclesTrip.js';

const router = express.Router();

/**
 * Bulk sync endpoint for tally-bridge
 * Takes trips array and inserts/updates them using VehiclesTrip model
 * This ensures all middleware (rank indexing, driver logs) is triggered
 */
router.post('/bulk-sync', async (req, res) => {
    try {
        const { trips } = req.body;
        
        if (!Array.isArray(trips) || trips.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'trips array is required and cannot be empty'
            });
        }

        console.log(`Processing ${trips.length} trips from tally-bridge`);
        
        // Prepare bulk operations
        const bulkOps = [];
        let skipped = 0;

        for (const trip of trips) {
            try {
                // Check if trip already exists
                const existingTrip = await findOne({ _id: trip._id });
                
                if (existingTrip) {
                    // Skip if operationally modified
                    if (existingTrip.OpretionallyModified === true) {
                        skipped++;
                        continue;
                    }
                    
                    // Update existing trip
                    const { _id, ...updateData } = trip;
                    bulkOps.push({
                        updateOne: {
                            filter: { _id },
                            update: { $set: updateData }
                        }
                    });
                } else {
                    // Insert new trip
                    bulkOps.push({
                        insertOne: {
                            document: trip
                        }
                    });
                }
            } catch (error) {
                console.error(`Error processing trip ${trip._id}:`, error);
            }
        }

        // Execute bulk write using VehiclesTrip model
        // This triggers all middleware hooks
        let result = { insertedCount: 0, modifiedCount: 0 };
        
        if (bulkOps.length > 0) {
            result = await bulkWrite(bulkOps, { ordered: false });
            console.log(`Bulk sync completed: ${result.insertedCount} inserted, ${result.modifiedCount} updated`);
        }

        res.json({
            success: true,
            result: {
                inserted: result.insertedCount || 0,
                updated: result.modifiedCount || 0,
                skipped,
                total: trips.length
            },
            message: `Processed ${trips.length} trips successfully`
        });

    } catch (error) {
        console.error('Bulk sync error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
    try {
        const { healthCheck } = await import('../../models/VehiclesTrip.js');
        const health = await healthCheck();
        const totalTrips = await countDocuments({});
        
        res.json({
            success: true,
            health: {
                ...health,
                totalTrips
            }
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Sync status endpoint
 */
router.get('/sync/status', async (req, res) => {
    try {
        const { getCacheStats } = await import('../../models/VehiclesTrip.js');
        const cacheStats = getCacheStats();
        
        const [total, recent, loaded] = await Promise.all([
            countDocuments({}),
            countDocuments({ StartDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
            countDocuments({ LoadStatus: 1 })
        ]);

        res.json({
            success: true,
            status: {
                cache: cacheStats,
                trips: { total, recent24h: recent, loaded }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
