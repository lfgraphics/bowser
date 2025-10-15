import dotenv from 'dotenv';
dotenv.config();
import { TripSheet } from '../models/TripSheets.js';
import { Types } from 'mongoose';
import { updateTripSheet } from './tripSheet.js';

const fetchLocationData = async (latitude, longitude) => {
    const apiKey = process.env.Google_Geocode_Api;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Check if the response is OK and has results
        if (data.status === "OK" && data.results.length > 0) {
            const route = data.results.find(components => components.types.includes("route")).address_components.find(components => components.types.includes("route")).long_name;
            const locality = data.results.find(component => component.types.includes("administrative_area_level_4")).address_components.find(levels => levels.types.includes("administrative_area_level_4")).long_name;
            const state = data.results.find(components => components.types.includes("administrative_area_level_1")).address_components.find(levels => levels.types.includes("administrative_area_level_1")).long_name;

            // Returning the data as a formatted string
            return `${route}, ${locality}, ${state}, Coordinates: ${latitude},${longitude}`;
        } else {
            console.warn(`Unable to capture the location - Status: ${data.status}`);
            return `Coordinates: ${latitude},${longitude}`;
        }
    } catch (error) {
        console.error(error);
        return null;
    }
};

const addRecordToTrip = async (fuelingTransaction) => {
    try {
        const newDispense = {
            transaction: fuelingTransaction._id,
            fuelQuantity: fuelingTransaction.fuelQuantity,
            isVerified: fuelingTransaction.verified,
            isPosted: fuelingTransaction.posted,
        };

        // Call the utility function to update the trip sheet
        const result = await updateTripSheet({
            tripSheetId: fuelingTransaction.tripSheetId,
            newDispense,
        });

        if (result.success) {
            console.log(`Record added/updated successfully in trip sheet: ${fuelingTransaction.tripSheetId}`);
        } else {
            console.error(`Failed to update trip sheet: ${result.message}`);
        }
    } catch (error) {
        console.error("Error in addRecordToTrip:", error);
    }
};

const removeDispenseFromTripSheet = async (dispenseIdToRemove) => {
    try {
        // Find the TripSheet that contains the dispense _id
        const tripSheet = await TripSheet.findOne({
            'dispenses.transaction': new Types.ObjectId(dispenseIdToRemove)
        });

        if (!tripSheet) {
            console.log(`No TripSheet found containing the specified dispense _id: ${dispenseIdToRemove}`);
            return false; // Indicate failure
        }

        console.log("Found TripSheet:", tripSheet);

        // Remove the dispense _id from the dispenses array
        await TripSheet.updateOne(
            { _id: tripSheet._id },
            { $pull: { dispenses: { transaction: new Types.ObjectId(dispenseIdToRemove) } } }
        );

        console.log("Dispense ID removed successfully!");
        return true; // Indicate success
    } catch (error) {
        console.error("Error while removing dispense ID:", error);
        return false; // Indicate failure
    }
}

// Named exports
export { fetchLocationData, addRecordToTrip, removeDispenseFromTripSheet };

// Default export for backward compatibility
export default { fetchLocationData, addRecordToTrip, removeDispenseFromTripSheet };