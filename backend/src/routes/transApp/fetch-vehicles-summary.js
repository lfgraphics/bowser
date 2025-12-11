import { Router } from 'express';
const router = Router();
import { getUserVehicles, getUsersDeactivatedVehicles } from './utils.js';
import { aggregate as aggregateTrips } from '../../models/VehiclesTrip.js';
import { find as findTransUsers } from '../../models/TransUser.js';
import { find as findVehicles } from '../../models/vehicle.js';

/**
 * GET /summary-stats/:userId
 * Returns counts for all 8 filter types
 */
router.get('/summary-stats/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const vehicles = await getUserVehicles(userId);
        const deactivatedVehicles = await getUsersDeactivatedVehicles(userId);
        const vehicleNos = vehicles.map(v => v);
        const activeVehicleNos = vehicleNos.filter(v => !deactivatedVehicles.includes(v));

        const result = await aggregateTrips([
            { $match: { VehicleNo: { $in: activeVehicleNos } } },
            { $sort: { StartDate: -1, rankindex: 1 } },
            {
                $group: {
                    _id: "$VehicleNo",
                    LatestTrip: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$LatestTrip" } },
            {
                $addFields: {
                    lastStatusUpdate: { $arrayElemAt: ["$statusUpdate", -1] },
                    endToLower: { $toLower: { $ifNull: ["$EndTo", ""] } }
                }
            },
            {
                $facet: {
                    loadedOnWay: [
                        {
                            $match: {
                                LoadStatus: 1,
                                $or: [
                                    { ReportingDate: { $exists: false } },
                                    { ReportingDate: { $eq: null } }
                                ]
                            }
                        },
                        { $count: 'count' }
                    ],
                    loadedReported: [
                        {
                            $match: {
                                LoadStatus: 1,
                                $and: [
                                    { ReportingDate: { $exists: true } },
                                    { ReportingDate: { $ne: null } },
                                    {
                                        $or: [
                                            {
                                                $or: [
                                                    { EndDate: { $exists: false } },
                                                    { EndDate: { $eq: null } }
                                                ]
                                            },
                                            {
                                                $or: [
                                                    { "LoadTripDetail.UnloadDate": { $exists: false } },
                                                    { "LoadTripDetail.UnloadDate": { $eq: null } }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        },
                        { $count: 'count' }
                    ],
                    emptyOnWay: [
                        {
                            $match: {
                                LoadStatus: 0,
                                $or: [
                                    { ReportingDate: { $exists: false } },
                                    { ReportingDate: { $eq: null } }
                                ]
                            }
                        },
                        { $count: 'count' }
                    ],
                    emptyReported: [
                        {
                            $match: {
                                LoadStatus: 0,
                                ReportingDate: { $exists: true },
                                ReportingDate: { $ne: null }
                            }
                        },
                        { $count: 'count' }
                    ],
                    emptyStanding: [
                        {
                            $match: {
                                LoadStatus: 1,
                                $and: [
                                    { "LoadTripDetail.UnloadDate": { $exists: true } },
                                    { "LoadTripDetail.UnloadDate": { $ne: null } }
                                ]
                            }
                        },
                        { $count: 'count' }
                    ],
                    outsideStanding: [
                        {
                            $match: {
                                LoadStatus: 0,
                                ReportingDate: { $exists: true },
                                ReportingDate: { $ne: null },
                                $and: [
                                    { "lastStatusUpdate.status": { $nin: ["Accident", "Breakdown", "Loaded"] } },
                                    { endToLower: { $not: { $regex: "gida office|maintenece|indian tanker|maintenance" } } },
                                    { driverStatus: { $ne: 0 } }
                                ]
                            }
                        },
                        { $count: 'count' }
                    ],
                    loaded: [
                        {
                            $match: {
                                LoadStatus: 0,
                                ReportingDate: { $exists: true },
                                ReportingDate: { $ne: null },
                                "lastStatusUpdate.status": "Loaded"
                            }
                        },
                        { $count: 'count' }
                    ],
                    otherStanding: [
                        {
                            $match: {
                                LoadStatus: 0,
                                ReportingDate: { $exists: true },
                                ReportingDate: { $ne: null },
                                $or: [
                                    {
                                        $and: [
                                            { "lastStatusUpdate.status": { $ne: "Loaded" } },
                                            { "lastStatusUpdate.status": { $in: ["Accident", "Breakdown"] } }
                                        ]
                                    },
                                    { endToLower: { $regex: "gida office|maintenece|indian tanker|maintenance" } },
                                    { driverStatus: 0 }
                                ]
                            }
                        },
                        { $count: 'count' }
                    ]
                }
            }
        ]).allowDiskUse(true);

        const stats = result[0] || {};

        res.status(200).json({
            loaded: {
                onWay: { count: stats.loadedOnWay?.[0]?.count || 0 },
                reported: { count: stats.loadedReported?.[0]?.count || 0 }
            },
            empty: {
                onWay: { count: stats.emptyOnWay?.[0]?.count || 0 },
                reported: { count: stats.emptyReported?.[0]?.count || 0 },
                standing: { count: stats.emptyStanding?.[0]?.count || 0 },
                outsideStanding: { count: stats.outsideStanding?.[0]?.count || 0 },
                loaded: { count: stats.loaded?.[0]?.count || 0 },
                otherStanding: { count: stats.otherStanding?.[0]?.count || 0 }
            }
        });

    } catch (error) {
        console.error('Error in summary stats:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

/**
 * GET /bucket-data/:userId
 * Returns paginated trip data for a specific filter bucket
 */
router.get('/bucket-data/:userId', async (req, res) => {
    const userId = req.params.userId;
    const {
        bucket = 'loadedOnWay',
        searchTerm = '',
        sortBy = 'EndTo',
        direction = 'asc',
        pageSize = 100,
        pageNo,
        page: pageParam,
        isAdmin: isAdminQuery
    } = req.query;

    try {
        const isAdmin = isAdminQuery === 'true' || isAdminQuery === '1';
        const limit = Math.max(1, parseInt(pageSize));
        const page = Math.max(1, parseInt(pageNo || pageParam || 1));
        const skip = (page - 1) * limit;
        const sortDirection = direction === 'desc' ? -1 : 1;
        const vehicles = await getUserVehicles(userId);
        const deactivatedVehicles = await getUsersDeactivatedVehicles(userId);
        const vehicleNos = vehicles.map(v => v);
        const activeVehicleNos = vehicleNos.filter(v => !deactivatedVehicles.includes(v));

        let bucketMatch = {};
        let needsStatusFields = false;

        switch (bucket) {
            case 'loadedOnWay':
                bucketMatch = {
                    LoadStatus: 1,
                    $or: [
                        { ReportingDate: { $exists: false } },
                        { ReportingDate: { $eq: null } }
                    ]
                };
                break;
            case 'loadedReported':
                bucketMatch = {
                    LoadStatus: 1,
                    $and: [
                        { ReportingDate: { $exists: true } },
                        { ReportingDate: { $ne: null } },
                        {
                            $or: [
                                {
                                    $or: [
                                        { EndDate: { $exists: false } },
                                        { EndDate: { $eq: null } }
                                    ]
                                },
                                {
                                    $or: [
                                        { "LoadTripDetail.UnloadDate": { $exists: false } },
                                        { "LoadTripDetail.UnloadDate": { $eq: null } }
                                    ]
                                }
                            ]
                        }
                    ]
                };
                break;
            case 'emptyOnWay':
                bucketMatch = {
                    LoadStatus: 0,
                    $or: [
                        { ReportingDate: { $exists: false } },
                        { ReportingDate: { $eq: null } }
                    ]
                };
                break;
            case 'emptyReported':
                bucketMatch = {
                    LoadStatus: 0,
                    ReportingDate: { $exists: true },
                    ReportingDate: { $ne: null }
                };
                break;
            case 'emptyStanding':
                bucketMatch = {
                    LoadStatus: 1,
                    $and: [
                        { "LoadTripDetail.UnloadDate": { $exists: true } },
                        { "LoadTripDetail.UnloadDate": { $ne: null } }
                    ]
                };
                break;
            case 'outsideStanding':
                needsStatusFields = true;
                bucketMatch = {
                    LoadStatus: 0,
                    ReportingDate: { $exists: true },
                    ReportingDate: { $ne: null },
                    $and: [
                        { "lastStatusUpdate.status": { $nin: ["Accident", "Breakdown", "Loaded"] } },
                        { endToLower: { $not: { $regex: "gida office|maintenece|indian tanker|maintenance" } } },
                        { driverStatus: { $ne: 0 } }
                    ]
                };
                break;
            case 'loaded':
                needsStatusFields = true;
                bucketMatch = {
                    LoadStatus: 0,
                    ReportingDate: { $exists: true },
                    ReportingDate: { $ne: null },
                    "lastStatusUpdate.status": "Loaded"
                };
                break;
            case 'otherStanding':
                needsStatusFields = true;
                bucketMatch = {
                    LoadStatus: 0,
                    ReportingDate: { $exists: true },
                    ReportingDate: { $ne: null },
                    $or: [
                        {
                            $and: [
                                { "lastStatusUpdate.status": { $ne: "Loaded" } },
                                { "lastStatusUpdate.status": { $in: ["Accident", "Breakdown"] } }
                            ]
                        },
                        { endToLower: { $regex: "gida office|maintenece|indian tanker|maintenance" } },
                        { driverStatus: 0 }
                    ]
                };
                break;
            default:
                return res.status(400).json({ error: 'Invalid bucket type' });
        }

        if (searchTerm) {
            bucketMatch.$and = bucketMatch.$and || [];
            bucketMatch.$and.push({
                $or: [
                    { VehicleNo: { $regex: searchTerm, $options: 'i' } },
                    { EndTo: { $regex: searchTerm, $options: 'i' } },
                    { StartFrom: { $regex: searchTerm, $options: 'i' } },
                    { superwiser: { $regex: searchTerm, $options: 'i' } },
                    { loadingSupervisor: { $regex: searchTerm, $options: 'i' } },
                    { loadingSuperVisor: { $regex: searchTerm, $options: 'i' } }
                ]
            });
        }

        const pipeline = [
            { $match: { VehicleNo: { $in: activeVehicleNos } } },
            { $sort: { StartDate: -1, rankindex: 1 } },
            {
                $group: {
                    _id: "$VehicleNo",
                    latestTrip: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$latestTrip" } },
        ];

        if (needsStatusFields) {
            pipeline.push({
                $addFields: {
                    lastStatusUpdate: { $arrayElemAt: ["$statusUpdate", -1] },
                    endToLower: { $toLower: { $ifNull: ["$EndTo", ""] } }
                }
            });
        }

        pipeline.push(
            { $match: bucketMatch },
            {
                $facet: {
                    totalCount: [{ $count: 'count' }],
                    data: [
                        { $sort: { [sortBy]: sortDirection } },
                        { $skip: skip },
                        { $limit: limit }
                    ]
                }
            }
        );

        const result = await aggregateTrips(pipeline).allowDiskUse(true);
        let trips = result[0]?.data || [];
        const totalCount = result[0]?.totalCount[0]?.count || 0;
        const totalPages = Math.ceil(totalCount / limit);

        if (isAdmin && trips.length > 0) {
            try {
                const vehicleNos = trips.map(t => t.VehicleNo);

                const users = await findTransUsers(
                    {
                        Division: { $in: [0, 1, 2, 3] },
                        myVehicles: { $in: vehicleNos }
                    },
                    { UserName: 1, myVehicles: 1 }
                ).lean();

                const vehicles = await findVehicles(
                    { VehicleNo: { $in: vehicleNos } },
                    { VehicleNo: 1, capacity: 1 }
                ).lean();

                const capacityMap = new Map(vehicles.map(v => [v.VehicleNo, v.capacity]));

                trips.forEach((trip) => {
                    const matchedUsers = users.filter(u => u.myVehicles.includes(trip.VehicleNo));
                    trip.superwiser = matchedUsers.map(u => u.UserName).join(", ") || "Not found";
                    trip.capacity = capacityMap.get(trip.VehicleNo) || 'N/A';
                });
            } catch (err) {
                console.error('Error enriching data:', err);
            }
        }

        res.status(200).json({
            bucket,
            totalCount,
            matchedCount: totalCount,
            data: trips,
            pagination: {
                currentPage: page,
                totalPages,
                pageSize: limit,
                hasMore: page < totalPages
            },
            searchTerm,
            sortBy,
            direction
        });

    } catch (error) {
        console.error('Error in bucket data:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;
