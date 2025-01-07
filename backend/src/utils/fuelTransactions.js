require('dotenv').config();
const TripSheet = require('../models/TripSheets')
const mongoose = require('mongoose')
const { updateTripSheet } = require('./tripSheet')

const fetchLocationData = async (latitude, longitude) => {
    const apiKey = process.env.Google_Geocode_Api;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Check if the response is OK and has results
        if (data.status === "OK" && data.results.length > 0) {
            const firstResult = data.results[0];
            const { address_components, geometry } = firstResult;

            // Extracting the short address components
            const locality = address_components.find(component => component.types.includes("locality"))?.short_name || '';
            const administrativeArea = address_components.find(component => component.types.includes("administrative_area_level_3"))?.short_name || '';
            const state = address_components.find(component => component.types.includes("administrative_area_level_1"))?.short_name || '';

            // Constructing the short address
            const shortAddress = `${locality}, ${administrativeArea}, ${state}`;

            // Extracting coordinates
            const { lat, lng } = geometry.location;

            // Returning the data as a formatted string
            return `${shortAddress}, Coordinates: ${lat}, ${lng}`;
        } else {
            console.log(`Unable to capture the location - Status: ${data.status}`);
            return null;
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
            'dispenses.transaction': new mongoose.Types.ObjectId(dispenseIdToRemove)
        });

        if (!tripSheet) {
            console.log(`No TripSheet found containing the specified dispense _id: ${dispenseIdToRemove}`);
            return false; // Indicate failure
        }

        console.log("Found TripSheet:", tripSheet);

        // Remove the dispense _id from the dispenses array
        await TripSheet.updateOne(
            { _id: tripSheet._id },
            { $pull: { dispenses: { transaction: new mongoose.Types.ObjectId(dispenseIdToRemove) } } }
        );

        console.log("Dispense ID removed successfully!");
        return true; // Indicate success
    } catch (error) {
        console.error("Error while removing dispense ID:", error);
        return false; // Indicate failure
    }
}

module.exports = { fetchLocationData, addRecordToTrip, removeDispenseFromTripSheet };