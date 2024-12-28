const TripSheet = require('../models/tripsheet')
const mongoose = require('mongoose')

const fetchLocationData = async (latitude, longitude) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;

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
        // Find the trip associated with the `fuelingTransaction.tripSheetId`
        let trip = await TripSheet.findOne({ tripSheetId: fuelingTransaction.tripSheetId }).populate("dispenses");

        if (!trip) {
            console.log("Trip not found");
            return;
        }
        // Ensure `recordId` is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(fuelingTransaction._id)) {
            console.log("Invalid recordId");
            return;
        }

        // Check if the recordId is already in the `dispenses` array
        const existingDispenseIndex = trip.dispenses.findIndex(dispense => dispense.transaction.toString() === fuelingTransaction._id.toString());

        if (existingDispenseIndex === -1) {
            // Add the `recordId` to the `dispenses` array
            trip.dispenses.push({
                transaction: fuelingTransaction._id,
                fuelQuantity: fuelingTransaction.fuelQuantity,
                isVerified: fuelingTransaction.verified,
                isPosted: fuelingTransaction.posted,
            });
            console.log("RecordId added to trips dispenses successfully!");
        } else {
            // Update the existing dispense
            trip.dispenses[existingDispenseIndex] = {
                transaction: fuelingTransaction._id,
                fuelQuantity: fuelingTransaction.fuelQuantity,
                isVerified: fuelingTransaction.verified,
                isPosted: fuelingTransaction.posted,
            };
            console.log("RecordId updated in trips dispenses successfully!");
        }

        // Save the trip document
        await trip.save();
    } catch (error) {
        console.error("Error updating trip dispenses:", error);
    }
}

const removeDispenseFromTripSheet = async (dispenseIdToRemove) => {
    try {
        // Find the TripSheet that contains the dispense _id
        const tripSheet = await TripSheet.findOne({
            dispenses: mongoose.Types.ObjectId(dispenseIdToRemove)
        });

        if (!tripSheet) {
            console.log("No TripSheet found containing the specified dispense _id.");
            return;
        }

        console.log("Found TripSheet:", tripSheet);

        // Remove the dispense _id from the dispenses array
        await TripSheet.updateOne(
            { _id: tripSheet._id },
            { $pull: { dispenses: mongoose.Types.ObjectId(dispenseIdToRemove) } }
        );

        console.log("Dispense ID removed successfully!");
    } catch (error) {
        console.error("Error while removing dispense ID:", error);
    }
}

module.exports = { fetchLocationData, addRecordToTrip, removeDispenseFromTripSheet };