import { aggregate as aggregateTrips } from '../../models/VehiclesTrip.js';
import { findById as findCampUserById } from '../../models/CampUsers.js';
import { find as findDrivers } from '../../models/driver.js';

const getLatestTripsOnCamps = async (userId) => {
    try {
        // Get user and their locations
        const user = await findCampUserById(userId).select('locations').lean();
        if (!user || !user.locations || user.locations.length === 0) {
            return [];
        }

        // Create regex patterns for location matching (case-insensitive)
        const locationRegexes = user.locations.map(location => 
            new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        );

        // Aggregate to get latest running trip per unique vehicle, or latest ended trip if no running trip exists
        const result = await aggregateTrips([
            {
                $match: {
                    $or: [
                        { StartFrom: { $in: locationRegexes } },
                        { EndTo: { $in: locationRegexes } }
                    ]
                }
            },
            // Add computed field to determine if trip is ended
            {
                $addFields: {
                    isEnded: {
                        $or: [
                            // Trip has EndDate
                            { $ne: ["$EndDate", null] },
                            // OR LoadStatus is 1 (Loaded) AND has UnloadingDate
                            {
                                $and: [
                                    { $eq: ["$LoadStatus", 1] },
                                    { $ne: ["$TallyLoadDetail.UnloadingDate", null] }
                                ]
                            }
                        ]
                    }
                }
            },
            // Sort by vehicle, then by running status (running first), then by date desc
            { 
                $sort: { 
                    VehicleNo: 1,
                    isEnded: 1,        // Running trips (false) first, then ended trips (true)
                    StartDate: -1,     // Latest first within each group
                    rankindex: 1       // Higher priority first
                } 
            },
            // Group by VehicleNo to get only one trip per vehicle (running trip preferred)
            {
                $group: {
                    _id: "$VehicleNo",
                    selectedTrip: { $first: "$$ROOT" } // Take the first trip (running if exists, otherwise latest ended)
                }
            },
            // Replace root to return the trip document
            { $replaceRoot: { newRoot: "$selectedTrip" } },
            // Final sort by StartDate descending to show most recent activity first
            { $sort: { StartDate: -1 } }
        ]).allowDiskUse(true);

        // Get driver details for each trip
        const tripsWithDrivers = await Promise.all(
            result.map(async (trip) => {
                let driverDetails = null;
                
                if (trip.StartDriver) {
                    try {
                        // Try to find driver by ITPLId or Name
                        driverDetails = await findDrivers({
                            $or: [
                                { ITPLId: { $regex: trip.StartDriver, $options: 'i' } },
                                { Name: { $regex: trip.StartDriver, $options: 'i' } }
                            ]
                        }).select('Name ITPLId MobileNo').limit(1).lean();
                        
                        if (driverDetails && driverDetails.length > 0) {
                            driverDetails = driverDetails[0];
                        } else {
                            driverDetails = null;
                        }
                    } catch (err) {
                        console.error('Error fetching driver details:', err);
                        driverDetails = null;
                    }
                }

                // Determine if trip is ended based on our logic
                const isEnded = trip.EndDate || (trip.LoadStatus === 1 && trip.TallyLoadDetail?.UnloadingDate);
                
                return {
                    ...trip,
                    vehicleNumber: trip.VehicleNo, // Map to frontend expected field name
                    driverName: driverDetails?.Name || trip.StartDriver || 'Unknown',
                    driverPhone: driverDetails?.MobileNo?.MobileNo || trip.StartDriverMobile || 'N/A',
                    driverITPLId: driverDetails?.ITPLId || 'N/A',
                    loadStatus: trip.LoadStatus === 1 ? 'Loaded' : 'Empty', // Load status instead of fuel
                    status: isEnded ? 'Completed' : 'Ongoing',
                    isEnded: isEnded
                };
            })
        );

        return tripsWithDrivers;
    } catch (error) {
        console.error('Error in getLatestTripsOnCamps:', error);
        throw error;
    }
}

export { getLatestTripsOnCamps };
