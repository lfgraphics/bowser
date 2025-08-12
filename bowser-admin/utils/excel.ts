import ExcelJS from "exceljs";
import { formatDate } from "@/lib/utils";
import { TankersTrip, TripsSummary } from "@/types";

interface GenerateReportParams {
    summary: TripsSummary;
    username: string;
    isAdmin?: boolean;
    fileName?: string;
}

/**
 * Groups trips by unloading location (EndTo)
 */
function groupByEndTo(trips: TankersTrip[]) {
    const grouped: Record<string, TankersTrip[]> = {};
    trips.forEach((trip) => {
        if (!grouped[trip.EndTo]) grouped[trip.EndTo] = [];
        grouped[trip.EndTo].push(trip);
    });
    return grouped;
}

/*
* Helper function to apply borders to a range
*/
function applyBorders(sheet: ExcelJS.Worksheet, startRow: number, endRow: number) {
    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
        const row = sheet.getRow(rowIndex);

        const values = Array.isArray(row.values) ? row.values : [];
        const hasData = values.some((val) => val !== null && val !== "" && val !== undefined);

        if (!hasData) continue;

        row.eachCell({ includeEmpty: false }, (cell) => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
        });
    }
}


/**
 * Creates an Excel report from trips summary and downloads it
 */
export async function generateTripsReport({
    summary,
    username,
    isAdmin = false,
    fileName = "Report.xlsx",
}: GenerateReportParams) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Trips Report");

    // === Report Header ===
    const now = new Date();
    // sheet.mergeCells("A1:D1");
    sheet.getCell("A1").value = `Report Generated on ${formatDate(now)} by ${username}`;
    sheet.getCell("A1").font = { bold: true, size: 14, underline: true, color: { theme: 3 } };
    sheet.getCell("A1").alignment = { horizontal: "center" };

    // === 1. Loaded Vehicles Section ===
    sheet.addRow([]);
    const loadedStart = sheet.lastRow!.number + 1;
    sheet.mergeCells(`A${loadedStart}:D${loadedStart}`);
    sheet.getCell(`A${loadedStart}`).value = "List of Loaded Vehicles by Unloading Station";
    sheet.getCell(`A${loadedStart}`).font = { bold: true, size: 12 };

    const loadedGrouped = groupByEndTo([
        ...summary.loaded.onWay.trips,
        ...summary.loaded.reported.trips,
    ]);

    sheet.addRow(isAdmin
        ? ["Unloading Station", "OnWays", "Reported", "LockNo", "Superwiser"]
        : ["Unloading Station", "OnWays", "Reported", "LockNo"]
    ).font = { bold: true };

    Object.entries(loadedGrouped).forEach(([station, trips]) => {
        trips.forEach((trip) => {
            sheet.addRow(
                isAdmin
                    ? [
                        station,
                        summary.loaded.onWay.trips.includes(trip) ? trip.TallyLoadDetail.VehicleNo : "",
                        summary.loaded.reported.trips.includes(trip) ? trip.TallyLoadDetail.VehicleNo : "",
                        trip.TallyLoadDetail.LockNo || "",
                        trip.superwiser || "",
                    ]
                    : [
                        station,
                        summary.loaded.onWay.trips.includes(trip) ? trip.TallyLoadDetail.VehicleNo : "",
                        summary.loaded.reported.trips.includes(trip) ? trip.TallyLoadDetail.VehicleNo : "",
                        trip.TallyLoadDetail.LockNo || "",
                    ]
            );
        });
    });

    const loadedEnd = sheet.lastRow!.number;
    applyBorders(sheet, loadedStart + 1, loadedEnd);

    // === 2. List of Programmed Vehicles ===
    sheet.addRow([]);
    const programmedStart = sheet.lastRow!.number + 1;
    sheet.mergeCells(`A${programmedStart + 1}:D${programmedStart + 1}`);
    sheet.getCell(`A${programmedStart}`).value = "List of Programmed Vehicles";
    sheet.getCell(`A${programmedStart}`).font = { bold: true, size: 12 };

    // Group from empty.onWay & empty.reported
    const programmedGrouped = groupByEndTo([
        ...summary.empty.onWay.trips,
        ...summary.empty.reported.trips,
    ]);

    sheet.addRow(
        isAdmin
            ? ["Proposed Location", "OnWays", "Reported", "LockNo", "Superwiser"]
            : ["Proposed Location", "OnWays", "Reported", "LockNo"]
    ).font = { bold: true };

    Object.entries(programmedGrouped).forEach(([location, trips]) => {
        trips.forEach((trip) => {
            sheet.addRow(
                isAdmin
                    ? [
                        location,
                        summary.empty.onWay.trips.includes(trip)
                            ? trip.EmptyTripDetail?.VehicleNo || ""
                            : "",
                        summary.empty.reported.trips.includes(trip)
                            ? trip.EmptyTripDetail?.VehicleNo || ""
                            : "",
                        trip.EmptyTripDetail?.LockNo || "",
                        trip.superwiser || "",
                    ]
                    : [
                        location,
                        summary.empty.onWay.trips.includes(trip)
                            ? trip.EmptyTripDetail?.VehicleNo || ""
                            : "",
                        summary.empty.reported.trips.includes(trip)
                            ? trip.EmptyTripDetail?.VehicleNo || ""
                            : "",
                        trip.EmptyTripDetail?.LockNo || "",
                    ]
            );
        });
    });

    const programmedEnd = sheet.lastRow!.number;
    applyBorders(sheet, programmedStart + 1, programmedEnd);

    // === 3. Empty Vehicles Section ===
    sheet.addRow([]);
    const emptyStart = sheet.lastRow!.number + 1;
    sheet.mergeCells(`A${emptyStart + 1}:D${emptyStart + 1}`);
    sheet.getCell(`A${emptyStart}`).value = "List of Empty Vehicles Standing at Unloading Station";
    sheet.getCell(`A${emptyStart}`).font = { bold: true, size: 12 };

    const standingGrouped = groupByEndTo(summary.empty.standing.trips);

    sheet.addRow(isAdmin
        ? ["Unloading Location", "Vehicle No", "Standing TL", "LockNo", "Superwiser"]
        : ["Unloading Location", "Vehicle No", "Standing TL", "LockNo"]
    ).font = { bold: true };

    Object.entries(standingGrouped).forEach(([location, trips]) => {
        trips.forEach((trip) => {
            sheet.addRow(
                isAdmin
                    ? [
                        location,
                        trip.VehicleNo || "",
                        formatDate(trip.TallyLoadDetail.ReportedDate),
                        trip.EmptyTripDetail?.LockNo || "",
                        trip.superwiser || "",
                    ]
                    : [
                        location,
                        trip.VehicleNo || "",
                        formatDate(trip.TallyLoadDetail.ReportedDate),
                        trip.EmptyTripDetail?.LockNo || "",
                    ]
            );
        });
    });

    const emptyEnd = sheet.lastRow!.number;
    applyBorders(sheet, emptyStart + 1, emptyEnd);

    // === Adjustment and styling ===
    sheet.columns.forEach(function (column) {
        if (column && typeof column.eachCell === 'function') { // Check if column and eachCell exist and are callable
            let dataMax = 0;
            column.eachCell({ includeEmpty: false }, function (cell) {
                const cellValueLength = cell.value ? cell.value.toString().length : 0;
                if (cellValueLength > dataMax) {
                    dataMax = cellValueLength;
                }
            });
            column.width = dataMax < 10 ? 10 : dataMax;
        }
    });


    // === Download Excel ===
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
}
