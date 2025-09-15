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

/*
* Helper function to set coluns width
*/
function setColumnWidth(sheet: ExcelJS.Worksheet, columnKeyOrIndex: string | number, width: number) {
    const column =
        typeof columnKeyOrIndex === "number"
            ? sheet.getColumn(columnKeyOrIndex)
            : sheet.getColumn(columnKeyOrIndex.toUpperCase());

    if (column) {
        column.width = width;
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
    const now = new Date();

    if (isAdmin) {
        // === Admin: Create separate sheets ===

        // === 1. Loaded Vehicles Sheet ===
        const loadedSheet = workbook.addWorksheet("Loaded Vehicles");
        loadedSheet.getCell("A1").value = `Report Generated on ${formatDate(now)} by ${username}`;
        loadedSheet.getCell("A1").font = { bold: true, size: 14, underline: true, color: { theme: 3 } };
        loadedSheet.getCell("A1").alignment = { horizontal: "center" };

        loadedSheet.addRow([]);
        loadedSheet.getCell("A3").value = "List of Loaded Vehicles by Unloading Station";
        loadedSheet.getCell("A3").font = { bold: true, size: 12 };
        loadedSheet.addRow(["Unloading Station", "OnWays", "Reported", "Superwiser"]).font = { bold: true };

        const loadedGrouped = groupByEndTo([
            ...summary.loaded.onWay.trips,
            ...summary.loaded.reported.trips,
        ]);

        Object.entries(loadedGrouped).forEach(([station, trips]) => {
            trips.forEach((trip) => {
                const vehicleNoOnWay = summary.loaded.onWay.trips.includes(trip) ? trip.TallyLoadDetail.VehicleNo : "";
                const vehicleNoReported = summary.loaded.reported.trips.includes(trip) ? trip.TallyLoadDetail.VehicleNo : "";
                const superwiser = trip.superwiser || "Not in frontend";

                const row = loadedSheet.addRow([
                    station,
                    vehicleNoOnWay,
                    vehicleNoReported,
                    superwiser,
                ]);

                if (trip.driverStatus === 0) {
                    row.eachCell((cell) => {
                        cell.font = {
                            color: { argb: 'FFDC2626' },
                        };
                    });
                }
            });
        });

        applyBorders(loadedSheet, 4, loadedSheet.lastRow!.number);

        // === 2. Programmed Vehicles Sheet ===
        const programmedSheet = workbook.addWorksheet("Programmed Vehicles");
        programmedSheet.getCell("A1").value = `Report Generated on ${formatDate(now)} by ${username}`;
        programmedSheet.getCell("A1").font = { bold: true, size: 14, underline: true, color: { theme: 3 } };
        programmedSheet.getCell("A1").alignment = { horizontal: "center" };

        programmedSheet.addRow([]);
        programmedSheet.getCell("A3").value = "List of Programmed Vehicles";
        programmedSheet.getCell("A3").font = { bold: true, size: 12 };
        programmedSheet.addRow(["Proposed Location", "OnWays", "Reported", "Superwiser"]).font = { bold: true };

        const programmedGrouped = groupByEndTo([
            ...summary.empty.onWay.trips,
            ...summary.empty.reported.trips,
        ]);

        Object.entries(programmedGrouped).forEach(([station, trips]) => {
            trips.forEach((trip) => {
                const vehicleNoOnWay = summary.empty.onWay.trips.includes(trip) ? trip.EmptyTripDetail?.VehicleNo || "" : ""; 
                const vehicleNoReported = summary.empty.reported.trips.includes(trip) ? trip.EmptyTripDetail?.VehicleNo || "" : "";                
                const superwiser = trip.superwiser || "Not in frontend";

                const row = loadedSheet.addRow([
                    station,
                    vehicleNoOnWay,
                    vehicleNoReported,
                    superwiser,
                ]);

                if (trip.driverStatus === 0) {
                    row.eachCell((cell) => {
                        cell.font = {
                            color: { argb: 'FFDC2626' },
                        };
                    });
                }
            });
        });

        applyBorders(programmedSheet, 4, programmedSheet.lastRow!.number);

        // === 3. Empty Vehicles Sheet ===
        const emptySheet = workbook.addWorksheet("Empty Vehicles");
        emptySheet.getCell("A1").value = `Report Generated on ${formatDate(now)} by ${username}`;
        emptySheet.getCell("A1").font = { bold: true, size: 14, underline: true, color: { theme: 3 } };
        emptySheet.getCell("A1").alignment = { horizontal: "center" };

        emptySheet.addRow([]);
        emptySheet.getCell("A3").value = "List of Empty Vehicles Standing at Unloading Station";
        emptySheet.getCell("A3").font = { bold: true, size: 12 };
        emptySheet.addRow(["Unloading Location", "Vehicle No", "Standing TL", "Superwiser"]).font = { bold: true };

        const standingGrouped = groupByEndTo(summary.empty.standing.trips);

        Object.entries(standingGrouped).forEach(([station, trips]) => {
            trips.forEach((trip) => {
                const vehicleNo = trip.VehicleNo || "";
                const standingFrom = formatDate(trip.TallyLoadDetail.UnloadingDate);
                const superwiser = trip.superwiser || "Not in frontend";

                const row = loadedSheet.addRow([
                    station,
                    vehicleNo,
                    standingFrom,
                    superwiser,
                ]);

                if (trip.driverStatus === 0) {
                    row.eachCell((cell) => {
                        cell.font = {
                            color: { argb: 'FFDC2626' },
                        };
                    });
                }
            });
        });

        applyBorders(emptySheet, 4, emptySheet.lastRow!.number);

        // For Admin - Loaded Vehicles Sheet
        setColumnWidth(loadedSheet, 1, 63); // Unloading Station
        setColumnWidth(loadedSheet, 2, 12); // OnWays
        setColumnWidth(loadedSheet, 3, 12); // Reported
        setColumnWidth(loadedSheet, 4, 13); // Superwiser

        // For Admin - Programmed Sheet
        setColumnWidth(programmedSheet, 1, 63);
        setColumnWidth(programmedSheet, 2, 12);
        setColumnWidth(programmedSheet, 3, 12);
        setColumnWidth(programmedSheet, 4, 13);

        // For Admin - Empty Vehicles Sheet
        setColumnWidth(emptySheet, 1, 63);
        setColumnWidth(emptySheet, 2, 12);
        setColumnWidth(emptySheet, 3, 18);
        setColumnWidth(emptySheet, 4, 13);
    } else {
        // === Non-admin: Keep single sheet ===
        const sheet = workbook.addWorksheet("Trips Report");
        sheet.getCell("A1").value = `Report Generated on ${formatDate(now)} by ${username}`;
        sheet.getCell("A1").font = { bold: true, size: 14, underline: true, color: { theme: 3 } };
        sheet.getCell("A1").alignment = { horizontal: "center" };

        // 1. Loaded Vehicles Section
        sheet.addRow([]);
        const loadedStart = sheet.lastRow!.number + 1;
        sheet.mergeCells(`A${loadedStart}:D${loadedStart}`);
        sheet.getCell(`A${loadedStart}`).value = "List of Loaded Vehicles by Unloading Station";
        sheet.getCell(`A${loadedStart}`).font = { bold: true, size: 12 };

        const loadedGrouped = groupByEndTo([
            ...summary.loaded.onWay.trips,
            ...summary.loaded.reported.trips,
        ]);

        sheet.addRow(["Unloading Station", "OnWays", "Reported"]).font = { bold: true };

        Object.entries(loadedGrouped).forEach(([station, trips]) => {
            trips.forEach((trip) => {
                const vehicleNoOnWay = summary.loaded.onWay.trips.includes(trip) ? trip.TallyLoadDetail.VehicleNo : "";
                const vehicleNoReported = summary.loaded.reported.trips.includes(trip) ? trip.TallyLoadDetail.VehicleNo : "";

                const row = sheet.addRow([
                    station,
                    vehicleNoOnWay,
                    vehicleNoReported
                ]);

                // Apply red (destructive) color to entire row if driverStatus is 0
                if (trip.driverStatus === 0) {
                    row.eachCell((cell) => {
                        cell.font = {
                            color: { argb: 'FFDC2626' }, // Red (Excel uses ARGB, prefix with 'FF')
                        };
                    });
                }
            });
        });

        const loadedEnd = sheet.lastRow!.number;
        applyBorders(sheet, loadedStart + 1, loadedEnd);

        // 2. Programmed Vehicles Section
        sheet.addRow([]);
        const programmedStart = sheet.lastRow!.number + 1;
        sheet.mergeCells(`A${programmedStart + 1}:D${programmedStart + 1}`);
        sheet.getCell(`A${programmedStart}`).value = "List of Programmed Vehicles";
        sheet.getCell(`A${programmedStart}`).font = { bold: true, size: 12 };

        const programmedGrouped = groupByEndTo([
            ...summary.empty.onWay.trips,
            ...summary.empty.reported.trips,
        ]);

        sheet.addRow(["Proposed Location", "OnWays", "Reported"]).font = { bold: true };

        Object.entries(loadedGrouped).forEach(([station, trips]) => {
            trips.forEach((trip) => {
                const vehicleNoOnWay = summary.empty.onWay.trips.includes(trip) ? trip.EmptyTripDetail?.VehicleNo || "" : "";
                const vehicleNoReported = summary.empty.reported.trips.includes(trip) ? trip.EmptyTripDetail?.VehicleNo || "" : "";

                const row = sheet.addRow([
                    station,
                    vehicleNoOnWay,
                    vehicleNoReported
                ]);

                if (trip.driverStatus === 0) {
                    row.eachCell((cell) => {
                        cell.font = {
                            color: { argb: 'FFDC2626' },
                        };
                    });
                }
            });
        });

        const programmedEnd = sheet.lastRow!.number;
        applyBorders(sheet, programmedStart + 1, programmedEnd);

        // 3. Empty Vehicles Section
        sheet.addRow([]);
        const emptyStart = sheet.lastRow!.number + 1;
        sheet.mergeCells(`A${emptyStart + 1}:D${emptyStart + 1}`);
        sheet.getCell(`A${emptyStart}`).value = "List of Empty Vehicles Standing at Unloading Station";
        sheet.getCell(`A${emptyStart}`).font = { bold: true, size: 12 };

        const standingGrouped = groupByEndTo(summary.empty.standing.trips);
        sheet.addRow(["Unloading Location", "Vehicle No", "Standing TL"]).font = { bold: true };

        Object.entries(loadedGrouped).forEach(([station, trips]) => {
            trips.forEach((trip) => {
                const location = station;
                const vehicle = trip.VehicleNo || "";
                const standingFrom = formatDate(trip.LoadTripDetail.UnloadDate);

                const row = sheet.addRow([
                    location,
                    vehicle,
                    standingFrom
                ]);

                if (trip.driverStatus === 0) {
                    row.eachCell((cell) => {
                        cell.font = {
                            color: { argb: 'FFDC2626' },
                        };
                    });
                }
            });
        });

        const emptyEnd = sheet.lastRow!.number;
        applyBorders(sheet, emptyStart + 1, emptyEnd);

        setColumnWidth(sheet, 1, 63); // Could be reused across all 3 sections
        setColumnWidth(sheet, 2, 12);
        setColumnWidth(sheet, 3, 12);
    }

    // === Generate and Download Excel File ===
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
