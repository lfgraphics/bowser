const { mongoose } = require('mongoose');
const TripSheet = require('../models/TripSheets')
/**
 * @function updateTripSheet
 * @description This function updates the trip sheet with new addition and dispense details. And performs the necessary calculations right thier and updates the Tripsheet\nIt receaves the details as an object
 * @param {ObjectId} sheetId - The _id of the sheet to be updated.
 * @param {number} tripSheetId - The tripSheetId (human understandable format of the sheet sequence).
 * @param {Object} newAddition - The new addition details.
 * @param {Object} newDispense - The new dispense details.
 * @returns {Object} - The updated trip sheet.
 */

const updateTripSheet = async ({ sheetId, tripSheetId, newAddition, newDispense, removeDispenseId }) => {
    try {
        // Build the query based on the identifier provided
        const query = sheetId
            ? { _id: new mongoose.Types.ObjectId(sheetId) }
            : { tripSheetId };

        // Fetch the trip sheet
        console.log('Query:', query, '\nReceived parameters\n');
        console.log(`sheetId: ${sheetId}, tripSheetId: ${tripSheetId}, newAddition: ${JSON.stringify(newAddition)}, newDispense: ${JSON.stringify(newDispense)}, removeDispenseId: ${removeDispenseId}`);
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

        // Remove a dispense if removeDispenseId is provided
        if (removeDispenseId) {
            tripSheet.dispenses = tripSheet.dispenses.filter(
                (dispense) => dispense.transaction.toString() !== removeDispenseId.toString()
            );
            console.log(`Removed dispense with ID: ${removeDispenseId}`);
        }

        // Perform recalculations
        const additionsQuantity = tripSheet.addition?.reduce(
            (sum, add) => sum + (add.quantityByDip || 0),
            0
        );
        const additionsQtyBySlip = tripSheet.addition?.reduce(
            (sum, add) => sum + (add.quantityBySlip || 0),
            0
        );
        const dispensedQuantity = tripSheet.dispenses?.reduce(
            (sum, dispense) => sum + (dispense.fuelQuantity || 0),
            0
        );

        tripSheet.loadQty = (tripSheet.loading?.quantityByDip || 0);
        tripSheet.totalAdditionQty = additionsQuantity;
        tripSheet.totalAdditionQtyBySlip = additionsQtyBySlip;
        tripSheet.totalLoadQuantityBySlip = (tripSheet.loading?.quantityBySlip || 0);
        tripSheet.totalLoadQuantity = (tripSheet.loading?.quantityByDip || 0) + additionsQuantity;
        tripSheet.saleQty = dispensedQuantity;
        tripSheet.balanceQty = tripSheet.totalLoadQuantity - tripSheet.saleQty;
        tripSheet.balanceQtyBySlip = tripSheet.totalLoadQuantityBySlip - tripSheet.saleQty;

        // Save the updated trip sheet
        await tripSheet.save();

        console.log(`TripSheet updated successfully for query: ${JSON.stringify(query)}`);
        return { success: true, message: "TripSheet updated successfully", tripSheet };
    } catch (error) {
        console.error("Error updating TripSheet:", error);
        return { success: false, message: "Error updating TripSheet" };
    }
};

module.exports = { updateTripSheet };
