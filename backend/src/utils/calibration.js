/**
 * Calculates the quantity based on calibration for a given chamber and level height.
 * 
 * @param {Array} bowserChambers - The chambers of the bowser.
 * @param {String} chamberId - The ID of the chamber.
 * @param {Number} levelHeight - The height level to calculate the quantity for.
 * @returns {Number} - The calculated quantity.
 * @throws {Error} - If the chamber is not found or invalid data is provided.
 */
const calculateQty = (bowserChambers, chamberId, levelHeight) => {
    const chamber = bowserChambers.find(ch => ch.chamberId === chamberId);
    if (!chamber) {
        throw new Error(`Chamber with ID ${chamberId} not found in Bowser.`);
    }

    let qty = 0;
    let prevLevel = null;

    for (const level of chamber.levels) {
        if (levelHeight <= level.levelHeight) {
            if (!prevLevel) {
                // If within the first level
                qty = level.levelCalibrationQty * levelHeight;
            } else {
                // If between two levels
                const heightDiff = levelHeight - prevLevel.levelHeight;
                qty = prevLevel.levelTotalQty + heightDiff * level.levelCalibrationQty;
            }
            break;
        }
        prevLevel = level;
    }

    return qty;
};

const calculateChamberLevels = (chambers) => {
    chambers.forEach((chamber) => {
        chamber.levels.sort((a, b) => a.levelNo - b.levelNo);

        let previousTotalQty = 0;
        let previousHeight = 0;

        chamber.levels.forEach((level, index) => {
            // Calculate levelTotalQty
            level.levelTotalQty = previousTotalQty + level.levelAdditionQty;

            // Calculate levelCalibrationQty
            if (index === 0) {
                level.levelCalibrationQty = level.levelHeight > 0 ? level.levelTotalQty / level.levelHeight : 0;
            } else {
                const qtyDiff = level.levelTotalQty - previousTotalQty;
                const heightDiff = level.levelHeight - previousHeight;
                level.levelCalibrationQty = heightDiff > 0 ? qtyDiff / heightDiff : 0;
            }

            // Update previous values
            previousTotalQty = level.levelTotalQty;
            previousHeight = level.levelHeight;
        });
    });

    return chambers;
};

module.exports = { calculateQty, calculateChamberLevels };
