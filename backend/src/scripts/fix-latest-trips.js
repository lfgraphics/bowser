import * as Vehicle from '../models/vehicle.js';
import * as TankersTrip from '../models/VehiclesTrip.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Create log file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFilePath = path.join(__dirname, 'fix-latest-trips.log');
let logContent = '';

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    logContent += logMessage + '\n';
    console.log(logMessage); // Still show in console for immediate feedback
}

function writeLogFile() {
    try {
        fs.writeFileSync(logFilePath, logContent, 'utf8');
        console.log(`\n📝 Log file written to: ${logFilePath}`);
    } catch (error) {
        console.error('Failed to write log file:', error);
    }
}

async function updateVehicleTrips() {
    try {
        log('Starting vehicle trip update process...');

        // Step 1: Find the last trip for each unique vehicle
        log('Step 1: Finding last trip for each vehicle...');

        const lastTrips = await TankersTrip.aggregate([
            {
                // Filter out trips without StartDate
                $match: {
                    VehicleNo: { $exists: true, $ne: null },
                    StartDate: { $ne: null }
                }
            },
            {
                $sort: { StartDate: -1, rankindex: 1, _id: -1 }
            },
            {
                $group: {
                    _id: '$VehicleNo',
                    tripId: { $first: '$_id' },
                    VehicleNo: { $first: '$VehicleNo' },
                    StartDate: { $first: '$StartDate' },
                    rankindex: { $first: '$rankindex' },
                    StartDriver: { $first: '$StartDriver' },
                    StartFrom: { $first: '$StartFrom' },
                    EndTo: { $first: '$EndTo' },
                    LoadStatus: { $first: '$LoadStatus' }
                }
            }
        ]);

        log(`Found ${lastTrips.length} unique vehicles with trips`);

        if (lastTrips.length === 0) {
            log('No trips found. Exiting...');
            return;
        }

        // Step 2: Extract vehicle numbers and trip IDs
        const vehicleNumbers = lastTrips.map(trip => trip.VehicleNo);
        const tripMapping = {};

        lastTrips.forEach(trip => {
            tripMapping[trip.VehicleNo] = {
                tripId: trip.tripId,
                StartDate: trip.StartDate,
                rankindex: trip.rankindex,
                StartDriver: trip.StartDriver,
                StartFrom: trip.StartFrom,
                EndTo: trip.EndTo,
                LoadStatus: trip.LoadStatus
            };
        });

        log('Step 2: Vehicle numbers and trip IDs collected');
        log('Vehicle numbers: ' + vehicleNumbers.join(', '));

        // Step 3: Find vehicles with those vehicle numbers
        log('Step 3: Finding vehicles in database...');

        const vehicles = await Vehicle.find({
            VehicleNo: { $in: vehicleNumbers }
        });

        log(`Found ${vehicles.length} vehicles in database`);

        // Step 4: Update each vehicle's tripDetails.id
        log('Step 4: Updating vehicle trip details...');

        let updatedCount = 0;
        let errors = [];

        for (const vehicle of vehicles) {
            try {
                const tripInfo = tripMapping[vehicle.VehicleNo];

                if (tripInfo) {
                    const updateResult = await Vehicle.findByIdAndUpdate(
                        vehicle._id,
                        {
                            $set: {
                                'tripDetails.id': tripInfo.tripId
                            }
                        },
                        { new: true }
                    );

                    if (updateResult) {
                        updatedCount++;
                        log(`✅ Updated vehicle ${vehicle.VehicleNo} (ID: ${vehicle._id}) with trip ID: ${tripInfo.tripId}`);

                        // Log additional trip details
                        log(`   Trip details: StartDate: ${tripInfo.StartDate}, rankindex: ${tripInfo.rankindex}, driver: ${tripInfo.StartDriver || 'N/A'}, from: ${tripInfo.StartFrom || 'N/A'}, to: ${tripInfo.EndTo || 'N/A'}, loadStatus: ${tripInfo.LoadStatus || 'N/A'}`);
                    } else {
                        errors.push(`Failed to update vehicle ${vehicle.VehicleNo}`);
                    }
                } else {
                    errors.push(`No trip mapping found for vehicle ${vehicle.VehicleNo}`);
                }
            } catch (error) {
                errors.push(`Error updating vehicle ${vehicle.VehicleNo}: ${error.message}`);
            }
        }

        // Step 5: Log summary details
        log('\n=== UPDATE SUMMARY ===');
        log(`Total vehicles processed: ${vehicles.length}`);
        log(`Successfully updated: ${updatedCount}`);
        log(`Errors encountered: ${errors.length}`);

        if (errors.length > 0) {
            log('\n=== ERRORS ===');
            errors.forEach(error => log(`❌ ${error}`));
        }

        // Step 6: Verify updates
        log('\n=== VERIFICATION ===');
        const updatedVehicles = await Vehicle.find({
            VehicleNo: { $in: vehicleNumbers },
            'tripDetails.id': { $exists: true, $ne: null }
        });

        log(`Verified ${updatedVehicles.length} vehicles have trip IDs assigned`);

        updatedVehicles.forEach(vehicle => {
            log(`Vehicle ${vehicle.VehicleNo}: Trip ID = ${vehicle.tripDetails.id}`);
        });

        // Step 7: Cross-verification with actual trips
        log('\n=== CROSS-VERIFICATION ===');
        for (const vehicle of updatedVehicles.slice(0, 5)) { // Check first 5 for sample
            const assignedTripId = vehicle.tripDetails.id;
            const actualTrip = await TankersTrip.findById(assignedTripId);

            if (actualTrip) {
                log(`✅ Vehicle ${vehicle.VehicleNo} -> Trip ${assignedTripId} verified`);
                log(`   StartDate: ${actualTrip.StartDate}, rankindex: ${actualTrip.rankindex}`);
            } else {
                log(`❌ Vehicle ${vehicle.VehicleNo} -> Trip ${assignedTripId} NOT FOUND`);
            }
        }

    } catch (error) {
        log('❌ Error in updateVehicleTrips: ' + error.message);
        throw error;
    } finally {
        writeLogFile();
    }
}

// Check if this script is being run directly
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
    updateVehicleTrips()
        .then(() => {
            console.log('✅ Vehicle trip update completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

export { updateVehicleTrips };