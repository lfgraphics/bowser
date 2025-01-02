const TripSheet = require('../models/TripSheets')

const updateTripSheet = async ({ sheetId, tripSheetId, newAddition, newDispense }) => {
    try {
        // Build the query based on the identifier provided
        const query = sheetId
            ? { _id: sheetId } // If `sheetId` (ObjectId) is provided
            : { tripSheetId }; // If `tripSheetId` (numerical sequence ID) is provided

        // Fetch the trip sheet
        const tripSheet = await TripSheet.findOne(query);

        if (!tripSheet) {
            console.error(`TripSheet not found for query: ${JSON.stringify(query)}`);
            return { success: false, message: "TripSheet not found" };
        }

        // Update the addition array if newAddition is provided
        if (newAddition) {
            tripSheet.addition.push(newAddition);
        }

        // Update the dispenses array if newDispense is provided
        if (newDispense) {
            const existingDispenseIndex = tripSheet.dispenses.findIndex(
                (dispense) => dispense.transaction.toString() === newDispense.transaction.toString()
            );

            if (existingDispenseIndex === -1) {
                // Add the new dispense record
                tripSheet.dispenses.push(newDispense);
            } else {
                // Update the existing dispense record
                tripSheet.dispenses[existingDispenseIndex] = newDispense;
            }
        }

        // Perform recalculations
        const additionsQuantity = tripSheet.addition.reduce(
            (sum, add) => sum + (add.quantityByDip || 0),
            0
        );
        const dispensedQuantity = tripSheet.dispenses.reduce(
            (sum, dispense) => sum + (dispense.fuelQuantity || 0),
            0
        );

        tripSheet.totalLoadQuantity = (tripSheet.loading?.quantityByDip || 0) + additionsQuantity;
        tripSheet.saleQty = dispensedQuantity;
        tripSheet.balanceQty = tripSheet.totalLoadQuantity - tripSheet.saleQty;

        // Save the updated trip sheet
        await tripSheet.save();

        console.log(`TripSheet updated successfully for query: ${JSON.stringify(query)}`);
        return { success: true, message: "TripSheet updated successfully" };
    } catch (error) {
        console.error("Error updating TripSheet:", error);
        return { success: false, message: "Error updating TripSheet" };
    }
};

module.exports = { updateTripSheet };
