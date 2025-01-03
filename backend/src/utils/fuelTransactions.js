const TripSheet = require('../models/TripSheets')
const mongoose = require('mongoose')
const { updateTripSheet } = require('./tripSheet')

const fetchLocationData = async (latitude, longitude) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;

    // we'll soon entigrate the google geocoding api to get the best possible location

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.address) {
            const { county: state, city, town, village } = data.address;
            const location = city || town || village;
            let obj = `${location}, ${data.address.state_district}, ${state}, ${"Cordinates: " + latitude + ", " + longitude}`
            return obj
        } else {
            console.log(`Unable to capture the location by nominatim's api- Cord are: lat = ${latitude}, long = ${longitude}`);
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