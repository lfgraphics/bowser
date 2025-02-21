const { mongoose } = require('mongoose');
const { TripSheet } = require('../models/TripSheets')
/**
 * @function updateTripSheet
 * @description This function updates the trip sheet with new addition and dispense details. And performs the necessary calculations right thier and updates the Tripsheet\nIt receaves the details as an object
 * @param {ObjectId} sheetId - The _id of the sheet to be updated.
 * @param {number} tripSheetId - The tripSheetId (human understandable format of the sheet sequence).
 * @param {Object} newAddition - The new addition details.
 * @param {Object} newDispense - The new dispense details.
 * @returns {Object} - The updated trip sheet.
 */
const updateTripSheet = async ({ sheetId, tripSheetId, newAddition, newDispense, removeDispenseId, verify }) => {
    try {
        // Build the query based on the identifier provided
        const query = sheetId ? { _id: new mongoose.Types.ObjectId(sheetId) } : { tripSheetId };

        const tripSheet = await TripSheet.findOne(query);

        if (!tripSheet) {
            console.error(`TripSheet not found for query: ${JSON.stringify(query)}`);
            return { success: false, message: "TripSheet not found" };
        }

        if (verify) {
            const existingDispenseIndex = tripSheet.dispenses.findIndex(
                (dispense) => dispense?._id?.toString() === verify?._id?.toString()
            );

            if (existingDispenseIndex === -1) {
                console.log(`No dispense found for the specified _id: ${verify?._id}`);
                return { success: false, message: "No dispense found" };
            } else {
                tripSheet.dispenses[existingDispenseIndex] = verify;
                await tripSheet.save()
                return { success: true, message: "TripSheet updated successfully", tripSheet };
            }
        }

        // Update the addition array if newAddition is provided
        if (newAddition) {
            tripSheet.addition.push(newAddition);
        }

        // Update the dispenses array if newDispense is provided
        if (newDispense) {

            delete newDispense.vehicleNumberPlateImage;
            delete newDispense.fuelMeterImage;

            newDispense.cost = Number((tripSheet.hsdRate * newDispense.fuelQuantity).toFixed(2));

            const existingDispenseIndex = tripSheet.dispenses.findIndex(
                (dispense) => dispense?._id?.toString() === newDispense?._id?.toString()
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
                (dispense) => dispense?._id?.toString() !== removeDispenseId.toString()
            );
            console.log(`Removed dispense with ID: ${removeDispenseId}`);
        }

        // Perform recalculations
        const additionsQuantity = tripSheet.addition?.reduce(
            (sum, add) => sum + (add.quantity || 0),
            0
        );
        const dispensedQuantity = tripSheet.dispenses?.reduce(
            (sum, dispense) => sum + (dispense.fuelQuantity || 0),
            0
        );

        tripSheet.loadQty = (tripSheet.loading?.quantityByDip || 0);
        tripSheet.totalAdditionQty = additionsQuantity;
        tripSheet.totalLoadQuantityBySlip = (tripSheet.loading?.quantityBySlip || 0);
        tripSheet.totalLoadQuantity = (tripSheet.loading?.quantityByDip || 0) + additionsQuantity;
        tripSheet.saleQty = dispensedQuantity;
        tripSheet.balanceQty = tripSheet.totalLoadQuantity - tripSheet.saleQty;
        tripSheet.balanceQtyBySlip = tripSheet.totalLoadQuantityBySlip - tripSheet.saleQty;

        await tripSheet.save();

        return { success: true, message: "TripSheet updated successfully", tripSheet };
    } catch (error) {
        console.error("Error updating TripSheet:", error);
        return { success: false, message: "Error updating TripSheet", error };
    }
};

const updateTripSheetBulk = async ({ tripSheetId, dispenses }) => {
    const tripSheet = await TripSheet.findOne({ tripSheetId });
    if (!tripSheet) {
        console.error(`TripSheet not found for query: ${JSON.stringify(query)}`);
        return { success: false, message: "TripSheet not found" };
    }
    try {
        tripSheet.dispenses.push(...dispenses);
        const additionsQuantity = tripSheet.addition?.reduce(
            (sum, add) => sum + (add.quantity || 0),
            0
        );
        const dispensedQuantity = tripSheet.dispenses?.reduce(
            (sum, dispense) => sum + (dispense.fuelQuantity || 0),
            0
        );
        tripSheet.loadQty = (tripSheet.loading?.quantityByDip || 0);
        tripSheet.totalAdditionQty = additionsQuantity;
        tripSheet.totalLoadQuantityBySlip = (tripSheet.loading?.quantityBySlip || 0);
        tripSheet.totalLoadQuantity = (tripSheet.loading?.quantityByDip || 0) + additionsQuantity;
        tripSheet.saleQty = dispensedQuantity;
        tripSheet.balanceQty = tripSheet.totalLoadQuantity - tripSheet.saleQty;
        tripSheet.balanceQtyBySlip = tripSheet.totalLoadQuantityBySlip - tripSheet.saleQty;

        await tripSheet.save();
        console.log(`TripSheet updated successfully for tripSheetId: ${tripSheetId}`);
        return { success: true, message: "TripSheet updated successfully" };
    } catch (error) {
        console.error("Error updating TripSheet:", error);
        return { success: false, message: "Error updating TripSheet", error };
    }
};

module.exports = { updateTripSheet, updateTripSheetBulk };
