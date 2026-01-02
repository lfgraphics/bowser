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
                    loadedOnWay: [ // total on way
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
                    loadedReported: [ // total reported
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

                    emptyOnWay: [ // empty onway
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
                    outsideStanding: [ // empty, reported, not inside distillery, with driver and not accidental
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
                    factoryIn: [ // entered in distillery for loading
                        {
                            $match: {
                                LoadStatus: 0,
                                ReportingDate: { $exists: true },
                                ReportingDate: { $ne: null },
                                "lastStatusUpdate.status": "In Distillery"

                            }
                        },
                        { $count: 'count' }
                    ],

                    emptyStanding: [ //second outside standing | depo standing
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
                    otherStanding: [ // standing at gida office
                        {
                            $match: {
                                LoadStatus: 0,
                                ReportingDate: { $exists: true },
                                ReportingDate: { $ne: null },
                                endToLower: { $regex: "gida office|indian tanker" },
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

                    noDriver: [
                        {
                            $match: {
                                driverStatus: 0
                            }
                        },
                        { $count: 'count' }
                    ],
                    underMaintenance: [
                        {
                            $match: {
                                endToLower: { $regex: "maintenece|maintenance" },
                            },
                        },
                        { $count: 'count' }
                    ],
                    accidental: [
                        {
                            $match: {
                                "lastStatusUpdate.status": { $in: ["Accident", "Breakdown"] }
                            }
                        },
                        { $count: 'count' }
                    ],
                },
            }
        ]).allowDiskUse(true);

        const stats = result[0] || {};

        res.status(200).json({
            loaded: {
                key: '1',
                icon: '/icons/newThemeIcons/just-loaded-vehicles.svg',
                filters: [
                    {
                        icon: '/icons/newThemeIcons/just-loaded.svg',
                        count: (stats.loadedReported?.[0]?.count || 0) + (stats.loadedOnWay?.[0]?.count || 0),
                        label: 'Total Loaded'
                    },
                    {
                        icon: '/icons/newThemeIcons/load-onway.svg',
                        count: stats.loadedOnWay?.[0]?.count || 0,
                        label: 'Total On Way'
                    },
                    {
                        icon: '/icons/newThemeIcons/reported-for-unload.svg',
                        count: stats.loadedReported?.[0]?.count || 0,
                        label: 'Reported'
                    }
                ]
            },
            emptyForLoading: {
                key: '2',
                icon: '/icons/newThemeIcons/factory-entered-vehicles.svg',
                filters: [
                    {
                        icon: '/icons/newThemeIcons/outside-standing.svg',
                        count: stats.outsideStanding?.[0]?.count || 0,
                        label: 'Outside Standing'
                    },
                    {
                        icon: '/icons/newThemeIcons/in-loading.svg',
                        count: stats.factoryIn?.[0]?.count || 0,
                        label: 'Factory In'
                    },
                    {
                        icon: '/icons/newThemeIcons/empty-onway.svg',
                        count: stats.emptyOnWay?.[0]?.count || 0,
                        label: 'On Way'
                    }
                ]
            },
            emptyOther: {
                key: '3',
                icon: '/icons/newThemeIcons/depot-standing-vehicles.svg',
                filters: [
                    {
                        icon: '/icons/newThemeIcons/depot-standing.svg',
                        count: stats.emptyStanding?.[0]?.count || 0,
                        label: 'Depot Standing'
                    },
                    {
                        icon: '/icons/newThemeIcons/standing-at-office.svg',
                        count: stats.otherStanding?.[0]?.count || 0,
                        label: 'Other Standing'
                    },
                    {
                        icon: '/icons/newThemeIcons/just-loaded.svg',
                        count: stats.loaded?.[0]?.count || 0,
                        lable: 'Loaded'
                    }
                ]
            },
            underMaintenance: {
                key: '4',
                icon: '/icons/newThemeIcons/vehicles-under-maintanance.svg',
                filters: [
                    {
                        icon: '/icons/newThemeIcons/under-maintanance.svg',
                        count: stats.underMaintenance?.[0]?.count || 0,
                        label: 'Under Maintenance'
                    },
                    {
                        icon: '/icons/newThemeIcons/accidental.svg',
                        count: stats.accidental?.[0]?.count || 0,
                        label: 'Accidental'
                    },
                    {
                        icon: '/icons/newThemeIcons/no-driver.svg',
                        count: stats.noDriver?.[0]?.count || 0,
                        label: 'No Driver'
                    }
                ]
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
        bucket = 'loaded',
        searchTerm = '',
        sortBy: sortByParam,
        direction = 'asc',
        pageSize = 100,
        pageNo,
        page: pageQuery,
        isAdmin: isAdminQuery
    } = req.query;

    try {
        const sortBy = sortByParam || 'EndTo';
        const isAdmin = isAdminQuery === 'true' || isAdminQuery === '1';
        const limit = Math.max(1, parseInt(pageSize));
        const page = Math.max(1, parseInt(pageNo || pageQuery || 1));
        const skip = (page - 1) * limit;
        const sortDirection = direction === 'desc' ? -1 : 1;
        const vehicles = await getUserVehicles(userId);
        const deactivatedVehicles = await getUsersDeactivatedVehicles(userId);
        const vehicleNos = vehicles.map(v => v);
        const activeVehicleNos = vehicleNos.filter(v => !deactivatedVehicles.includes(v));

        let bucketMatch = {};
        let needsStatusFields = false;

        switch (bucket) {
            // ===================================
            // Loaded Category (key: 1, label: loaded)
            // ===================================
            case 'loaded': // Main Category
            case 'loaded_total_loaded':
                bucketMatch = {
                    LoadStatus: 1,
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
                };
                break;
            case 'loaded_total_on_way':
                bucketMatch = {
                    LoadStatus: 1,
                    $or: [
                        { ReportingDate: { $exists: false } },
                        { ReportingDate: { $eq: null } }
                    ]
                };
                break;
            case 'loaded_reported':
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

            // ===================================
            // Empty For Loading Category (key: 2, label: emptyForLoading)
            // ===================================
            case 'emptyForLoading': // Main Category
                needsStatusFields = true;
                bucketMatch = {
                    $or: [
                        // emptyOnWay
                        {
                            LoadStatus: 0,
                            $or: [
                                { ReportingDate: { $exists: false } },
                                { ReportingDate: { $eq: null } }
                            ]
                        },
                        // factoryIn
                        {
                            LoadStatus: 0,
                            ReportingDate: { $exists: true }, // implied $ne: null
                            "lastStatusUpdate.status": "In Distillery"
                        },
                        // outsideStanding
                        {
                            LoadStatus: 0,
                            ReportingDate: { $exists: true },
                            $and: [
                                { "lastStatusUpdate.status": { $nin: ["Accident", "Breakdown", "In Distillery"] } },
                                { endToLower: { $not: { $regex: "gida office|maintenece|indian tanker|maintenance" } } },
                                { driverStatus: { $ne: 0 } }
                            ]
                        }
                    ]
                };
                break;
            case 'emptyForLoading_outside_standing':
                needsStatusFields = true;
                bucketMatch = {
                    LoadStatus: 0,
                    ReportingDate: { $exists: true },
                    ReportingDate: { $ne: null },
                    $and: [
                        { "lastStatusUpdate.status": { $nin: ["Accident", "Breakdown", "In Distillery"] } },
                        { endToLower: { $not: { $regex: "gida office|maintenece|indian tanker|maintenance" } } },
                        { driverStatus: { $ne: 0 } }
                    ]
                };
                break;
            case 'emptyForLoading_factory_in':
                needsStatusFields = true;
                bucketMatch = {
                    LoadStatus: 0,
                    ReportingDate: { $exists: true },
                    ReportingDate: { $ne: null },
                    "lastStatusUpdate.status": "In Distillery"
                };
                break;
            case 'emptyForLoading_on_way':
                bucketMatch = {
                    LoadStatus: 0,
                    $or: [
                        { ReportingDate: { $exists: false } },
                        { ReportingDate: { $eq: null } }
                    ]
                };
                break;

            // ===================================
            // Empty Other Category (key: 3, label: emptyOther)
            // ===================================
            case 'emptyOther': // Main Category
                needsStatusFields = true;
                bucketMatch = {
                    $or: [
                        // emptyStanding (Depot Standing)
                        {
                            LoadStatus: 1,
                            $and: [
                                { "LoadTripDetail.UnloadDate": { $exists: true } },
                                { "LoadTripDetail.UnloadDate": { $ne: null } }
                            ]
                        },
                        // otherStanding (Other Standing)
                        {
                            LoadStatus: 0,
                            ReportingDate: { $exists: true },
                            ReportingDate: { $ne: null },
                            endToLower: { $regex: "gida office|indian tanker" }
                        },
                        // loaded (Loaded)
                        {
                            LoadStatus: 0,
                            ReportingDate: { $exists: true },
                            ReportingDate: { $ne: null },
                            "lastStatusUpdate.status": "Loaded"
                        }
                    ]
                };
                break;
            case 'emptyOther_depot_standing':
                bucketMatch = {
                    LoadStatus: 1,
                    $and: [
                        { "LoadTripDetail.UnloadDate": { $exists: true } },
                        { "LoadTripDetail.UnloadDate": { $ne: null } }
                    ]
                };
                break;
            case 'emptyOther_other_standing':
                needsStatusFields = true;
                bucketMatch = {
                    LoadStatus: 0,
                    ReportingDate: { $exists: true },
                    ReportingDate: { $ne: null },
                    endToLower: { $regex: "gida office|indian tanker" }
                };
                break;
            case 'emptyOther_loaded':
                needsStatusFields = true;
                bucketMatch = {
                    LoadStatus: 0,
                    ReportingDate: { $exists: true },
                    ReportingDate: { $ne: null },
                    "lastStatusUpdate.status": "Loaded"
                };
                break;

            // ===================================
            // Under Maintenance Category (key: 4, label: underMaintenance)
            // ===================================
            case 'underMaintenance': // Main Category
                needsStatusFields = true;
                bucketMatch = {
                    $or: [
                        { endToLower: { $regex: "maintenece|maintenance" } },
                        { "lastStatusUpdate.status": { $in: ["Accident", "Breakdown"] } },
                        { driverStatus: 0 }
                    ]
                };
                break;
            case 'underMaintenance_under_maintenance':
                needsStatusFields = true;
                bucketMatch = {
                    endToLower: { $regex: "maintenece|maintenance" }
                };
                break;
            case 'underMaintenance_accidental':
                needsStatusFields = true;
                bucketMatch = {
                    "lastStatusUpdate.status": { $in: ["Accident", "Breakdown"] }
                };
                break;
            case 'underMaintenance_no_driver':
                bucketMatch = {
                    driverStatus: 0
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
                    { loadingSupervisor: { $regex: searchTerm, $options: 'i' } }
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
