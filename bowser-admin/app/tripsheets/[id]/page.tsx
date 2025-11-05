"use client"
import { BASE_URL } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { WholeTripSheet } from "@/types";
import axios from 'axios';
import React, { use, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Modal from '@/components/Modal';
import Loading from '@/app/loading';
import TripCalculationModal from '@/components/exclusive/TripCalculationModal';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Check, Eye, X } from 'lucide-react';
import OnlyAllowed from '@/components/OnlyAllowed';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface WholeTripSheetCardProps {
    record: WholeTripSheet;
}

const WholeTripSheetCard: React.FC<WholeTripSheetCardProps> = ({ record }) => {
    const [loading, setLoading] = useState(false);
    const [showAlert, setShowAlert] = useState<boolean>(false);
    const [alertTitle, setAlertTitle] = useState("");
    const [alertMessage, setAlertMessage] = useState("");
    const [deleteRecord, setDeleteRecord] = useState<string>("");
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isCalculationModalOpen, setIsCalculationModalOpen] = useState(false);

    const openImageModal = (image: string) => {
        setSelectedImage(image);
        setIsModalOpen(true);
    };
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedImage(null);
    };

    const openCalculationModal = () => {
        setIsCalculationModalOpen(true);
    };

    const closeCalculationModal = () => {
        setIsCalculationModalOpen(false);
    };

    const handleDelete = async () => {
        setLoading(true)
        try {
            await axios.delete(`${BASE_URL}/tripSheet/delete-dispense?tripSheetId=${record.tripSheetId}&id=${deleteRecord}`);
            setShowAlert(true);
            setAlertTitle("Success");
            setAlertMessage("Deleted Successfully");
            window.location.reload();
        } catch (error) {
            console.error('Error deleting Trip Sheet:', error);
            alert(`Error deleting Trip Sheet: ${error}`);
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {loading && <Loading />}
            <Card className="shadow-lg mt-8 p-4">
                {/* Header */}
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        Trip Sheet ID: {record.tripSheetId}
                    </CardTitle>
                </CardHeader>

                {/* Content */}
                <CardContent>
                    <div className='flex flex-col gap-2 my-3'>
                        <h2 className="font-semibold text-md">Bowser Information</h2>
                        <p><strong>Registration No: </strong>{record.bowser.regNo}</p>
                        <strong>Driver/s</strong>
                        {record.bowser.driver.map((driver, index) => (
                            <div key={index}>
                                <p>Driver Name: {driver.name}</p>
                                <p>Phone No: {driver.phoneNo}</p>
                                <p>Hand Over Date: {formatDate(driver.handOverDate!)}</p>
                            </div>
                        ))}
                    </div>
                    <Separator />
                    <div className='my-3'>
                        <h2 className="my-2 font-semibold text-xl">Loading Information</h2>
                        <p>Quantity by Dip: {record.loading.quantityByDip.toFixed(2)}</p>
                        <p>Quantity by Slip: {record.loading.quantityBySlip}</p>
                        <Separator className='mx-auto mt-3 w-[95%]' />
                        <div className='my-3'>
                            <h2 className="font-semibold text-md">Chamberwise Dip List Before</h2>
                            {record.loading.sheetId?.chamberwiseDipListBefore.map((chamber, index) => (
                                <div key={index}>
                                    <p>Chamber ID: {chamber.chamberId}</p>
                                    <p>Level Height: {chamber.levelHeight}</p>
                                    <p>Quantity: {chamber.qty.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                        <div className='my-3'>
                            <h2 className="font-semibold text-md">Chamberwise Dip List After</h2>
                            {record.loading.sheetId.chamberwiseDipListAfter.map((chamber, index) => (
                                <div key={index}>
                                    <p>Chamber ID: {chamber.chamberId}</p>
                                    <p>Level Height: {chamber.levelHeight}</p>
                                    <p>Quantity: {chamber.qty.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                        <Separator className='mx-auto w-[95%]' />
                        <div className='my-3'>
                            <h2 className="font-semibold text-md">Chamberwise Seal List</h2>
                            {record.loading.sheetId.chamberwiseSealList.map((seal, index) => (
                                <div key={index}>
                                    <p>{seal.chamberId}</p>
                                    <p>Seal ID: {seal.sealId}</p>
                                    <img src={seal.sealPhoto} onClick={() => openImageModal(seal.sealPhoto)} alt={`Seal for ${seal.chamberId}`} className="w-32 h-32 object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className='my-3'>
                        <h2 className="my-2 font-semibold text-xl">Closing Information</h2>
                        <h2 className="font-semibold text-md">Chamberwise Dip List Before</h2>
                        {record.settelment?.details.chamberwiseDipList.map((chamber, index) => (
                            <div key={index}>
                                <p>Chamber ID: {chamber.chamberId}</p>
                                <p>Level Height: {chamber.levelHeight}</p>
                                <p>Quantity: {chamber.qty.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                    <Separator className='my-3' />
                    {record.dispenses && <>
                        <strong>Dispenses: </strong>{record.dispenses.length}
                        <p>Total Fuel Quantity Dispensed: {record.dispenses.reduce((acc, curr) => acc + Number(curr.fuelQuantity), 0).toFixed(2)}</p>
                    </>
                    }
                    <Separator className='my-3' />
                    {record.addition && record.addition?.length > 0 && <>
                        <h2 className="my-2 font-semibold text-xl">Addition/ Reloading Information</h2>
                        {record.addition?.map((addition, index) => (
                            <div className='my-3' key={index}>
                                <p>Quantity by Dip: {addition.quantityByDip}</p>
                                <p>Quantity by Slip: {addition.quantityBySlip}</p>
                                <Separator className='mx-auto mt-3 w-[95%]' />
                                <div className='my-3'>
                                    <h2 className="font-semibold text-md">Chamberwise Dip List Before</h2>
                                    {addition.sheetId?.chamberwiseDipListBefore.map((chamber, index) => (
                                        <div key={index}>
                                            <p>Chamber ID: {chamber.chamberId}</p>
                                            <p>Level Height: {chamber.levelHeight}</p>
                                            <p>Quantity: {chamber.qty.toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className='my-3'>
                                    <h2 className="font-semibold text-md">Chamberwise Dip List After</h2>
                                    {addition.sheetId?.chamberwiseDipListAfter.map((chamber, index) => (
                                        <div key={index}>
                                            <p>Chamber ID: {chamber.chamberId}</p>
                                            <p>Level Height: {chamber.levelHeight}</p>
                                            <p>Quantity: {chamber.qty.toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                                <Separator className='mx-auto w-[95%]' />
                                <div className='my-3'>
                                    <h2 className="font-semibold text-md">Chamberwise Seal List</h2>
                                    {addition.sheetId?.chamberwiseSealList.map((seal, index) => (
                                        <div key={index}>
                                            <p>{seal.chamberId}</p>
                                            <p>Seal ID: {seal.sealId}</p>
                                            <img src={seal.sealPhoto} onClick={() => openImageModal(seal.sealPhoto)} alt={`Seal for ${seal.chamberId}`} className="w-32 h-32 object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <Separator />
                    </>
                    }
                    <div className='my-3'>
                        <h2 className="font-semibold text-md">Settlement Information</h2>
                        {record.settelment?.settled ? <>
                            <strong>Settlement Date: </strong>{formatDate(record.settelment?.dateTime)}
                            <br />
                            <strong>Qty on return</strong>{record.settelment.details.totalQty}
                            <br />
                            <strong>Pump Reading on return</strong>{record.settelment.details.pumpReading}
                            <br />
                            <Badge variant={record.settelment?.settled ? "succes" : "destructive"}>
                                {record.settelment?.settled ? "Settled" : "Not Settled"}
                            </Badge>
                        </>
                            : <Badge variant={record.settelment?.settled ? "succes" : "destructive"}>
                                {record.settelment?.settled ? "Settled" : "Not Settled"}
                            </Badge>
                        }
                    </div>
                </CardContent>

                {/* Footer */}
                <CardFooter>
                    <Badge variant={record.posted ? "succes" : "destructive"}>
                        {record.posted ? "Posted to Tally" : "Not Posted to Tally"}
                    </Badge>
                </CardFooter>
            </Card>
            <Table className="w-max min-w-full">
                <TableHeader>
                    <TableRow>
                        <TableHead>S N</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Party/Vendor</TableHead>
                        <TableHead>Fueling Time</TableHead>
                        <TableHead>Bowser Location</TableHead>
                        <TableHead>Driver/Manager</TableHead>
                        <TableHead>Phone No.</TableHead>
                        <TableHead>Vehicle Number</TableHead>
                        <TableHead>Odo Meter</TableHead>
                        <TableHead>Qty Type</TableHead>
                        <TableHead>Fuel Qty</TableHead>
                        <TableHead className='text-center'>Action</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead>Posted</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="h-[50%] overflow-y-scroll">
                    {record.dispenses.length > 0 &&
                        record.dispenses.map((record, index) => (
                            <TableRow
                                key={index}
                            >
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{record.category}</TableCell>
                                <TableCell>{record.category !== "Own" ? record.party : "Not Applicable"}</TableCell>
                                <TableCell>{`${formatDate(
                                    record.fuelingDateTime
                                )}`}</TableCell>
                                <TableCell>
                                    {record.location?.substring(0, 15) + "..."}
                                </TableCell>
                                <TableCell>{record.driverName}</TableCell>
                                <TableCell>{record.driverMobile}</TableCell>
                                <TableCell>{record.vehicleNumber}</TableCell>
                                <TableCell>{record.odometer}</TableCell>
                                <TableCell>{record.quantityType}</TableCell>
                                <TableCell>{record.fuelQuantity}</TableCell>
                                <TableCell className="flex items-center gap-2">
                                    <Link href={`/dispense-records/${record._id}`}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Eye />
                                        </Button>
                                    </Link>

                                    {!record.posted && <OnlyAllowed allowedRoles={["Admin", "BCC Authorized Officer", "Trans App"]}>
                                        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" onClick={() => { setShowDeleteDialog(true); setDeleteRecord(record._id) }}>Delete</Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete this trip sheet? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </OnlyAllowed>}
                                </TableCell>
                                <TableCell>
                                    {record.verified ? (<Check />) : (<X />)}
                                </TableCell>
                                <TableCell>
                                    {record.posted ? (
                                        <Check />
                                    ) : (<X />)}
                                </TableCell>
                            </TableRow>
                        ))}

                    <TableRow>
                        <TableCell colSpan={10} className="text-right font-bold">
                            Total Fuel Quantity:
                        </TableCell>
                        <TableCell colSpan={2}>
                            {record.dispenses.reduce((total, record) => total + Number(record.fuelQuantity), 0).toFixed(2)}{" "}L
                        </TableCell>
                        <TableCell
                            colSpan={2}
                            className="text-right font-bold"
                        ></TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            {showAlert &&
                <AlertDialog open={showAlert} onOpenChange={setShowAlert} >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {alertMessage}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Okay</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            }

            <Button onClick={openCalculationModal}>Show Calculations</Button>
            <Modal isOpen={isModalOpen} onClose={closeModal}>
                {selectedImage && (
                    <img
                        src={selectedImage}
                        alt="Enlarged"
                        className="w-full h-auto object-contain"
                    />
                )}
            </Modal >
            <Modal isOpen={isCalculationModalOpen} onClose={closeCalculationModal}>
                <TripCalculationModal record={record} />
            </Modal>
        </>
    );
};

export const page = ({
    params,
}: {
    params: Promise<{ id: string }>
}) => {
    const [id, setId] = useState<string>("");
    useEffect(() => {
        const fetchId = async () => {
            const resolvedParams = await params;
            setId(resolvedParams.id);
        };
        fetchId();
    }, [params]);

    const [loading, setLoading] = useState(false);
    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);

    const dummyRecord: WholeTripSheet = {
        hsdRate: 0,
        _id: "someId",
        tripSheetId: 1324,
        createdAt: new Date(),
        tripSheetGenerationDateTime: new Date(),
        bowser: {
            regNo: "UPXXATXXXX",
            driver: [{
                handOverDate: new Date(),
                name: "Driver Name",
                phoneNo: "0123456789"
            }]
        },
        fuelingAreaDestination: "string",
        proposedDepartureTime: "string",
        loading: {
            sheetId: {
                _id: "string",
                regNo: "string",
                odoMeter: 0,
                totalLoadQuantityByDip: 0,
                totalLoadQuantityBySlip: 0,
                bccAuthorizedOfficer: {
                    id: "string",
                    name: "string",
                    orderId: {
                        _id: "string",
                        createdAt: "string",
                        regNo: "string",
                        product: "string",
                        loadingLocation: "string",
                        loadingLocationName: "string",
                        bccAuthorizedOfficer: { id: "string", name: "string" },
                        fulfilled: false
                    }
                },
                chamberwiseDipListAfter: [{
                    chamberId: "chamber1",
                    levelHeight: 10,
                    qty: 5
                }],
                chamberwiseDipListBefore: [{
                    chamberId: "chamber1",
                    levelHeight: 10,
                    qty: 4
                }],
                chamberwiseSealList: [{
                    chamberId: "chamber1",
                    sealId: "seal1",
                    sealPhoto: "url_to_seal_photo"
                }],
                createdAt: "string",
                fuleingMachine: "string",
                fulfilled: false,
                loadingIncharge: {
                    id: "string",
                    name: "string"
                },
                pumpReadingAfter: 0,
                pumpReadingBefore: 0,
                pumpSlips: [],
                product: "HSD",
                tempLoadByDip: 0,
                changeInOpeningDip: {
                    reason: '',
                    remarks: ''
                }
            },
            quantityByDip: 0,
            quantityBySlip: 0
        },
        addition: [{
            quantity: 0,
            at: new Date(),
            sheetId: {
                _id: "string",
                regNo: "string",
                odoMeter: 0,
                totalLoadQuantityByDip: 0,
                totalLoadQuantityBySlip: 0,
                bccAuthorizedOfficer: {
                    id: "string",
                    name: "string",
                    orderId: {
                        _id: "string",
                        createdAt: "string",
                        regNo: "string",
                        product: "string",
                        loadingLocation: "string",
                        loadingLocationName: "string",
                        bccAuthorizedOfficer: { id: "string", name: "string" },
                        fulfilled: false
                    }
                },
                chamberwiseDipListAfter: [{
                    chamberId: "chamber2",
                    levelHeight: 12,
                    qty: 6
                }],
                chamberwiseDipListBefore: [{
                    chamberId: "chamber2",
                    levelHeight: 12,
                    qty: 5
                }],
                chamberwiseSealList: [{
                    chamberId: "chamber2",
                    sealId: "seal2",
                    sealPhoto: "url_to_seal_photo_2"
                }],
                createdAt: "string",
                fuleingMachine: "string",
                fulfilled: false,
                loadingIncharge: {
                    id: "string",
                    name: "string"
                },
                pumpReadingAfter: 0,
                pumpReadingBefore: 0,
                pumpSlips: [],
                product: "HSD",
                tempLoadByDip: 0,
                changeInOpeningDip: {
                    reason: '',
                    remarks: ''
                }
            },
            quantityByDip: 0,
            quantityBySlip: 0
        }],
        dispenses: [],
        totalLoadQuantity: 0,
        saleQty: 0,
        balanceQty: 0,
        settelment: {
            dateTime: new Date(),
            details: {
                odometer: 0,
                pumpReading: 0,
                chamberwiseDipList: [],
                totalQty: 0,
                extras: {
                    filledByDriver: 0,
                    hsdRateFor: 0,
                    tollTax: 0,
                    borderOtherExp: 0,
                    unload: 0,
                    hsdPerKm: 0,
                    saleryTotal: 0,
                    foodingTotal: 0,
                    rewardTotal: 0
                }
            },
            settled: false
        },
        posted: false,
        closure: {
            dateTime: '',
            details: {
                reason: '',
                remarks: ''
            }
        }
    }

    const [record, setRecord] = useState<WholeTripSheet>(dummyRecord);
    useEffect(() => {
        const fetchRecords = async () => {
            const resolvedParams = await params;
            const id = resolvedParams.id;
            if (!id) return;
            try {
                setLoading(true)
                const response = await axios.get(`${BASE_URL}/tripSheet/${id}`);
                setRecord(response.data);
                console.log(response.data)
            } catch (error) {
                console.error('Error fetching records:', error);
            } finally {
                setLoading(false)
            }
        };

        fetchRecords();
    }, [id]);

    const handlePrint = () => {
        if (!id) return;
        const printURL = `${window.location.origin}/tripsheets/settle/print/${id}`; // Your print route
        const newWindow = window.open(printURL, '_blank');
        newWindow?.focus();

        // Wait for 5 seconds before calling print
        setTimeout(() => {
            newWindow?.print(); // Open the print dialog
        }, 5000); // 5000 milliseconds = 5 seconds
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === 'p') {
                event.preventDefault(); // Prevent the default print dialog
                handlePrint(); // Call the print function
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);
    return (
        <>
            <Button onClick={handlePrint} className="mb-4">Print Table</Button>
            {loading && <Loading />}
            <WholeTripSheetCard record={record} />
        </>
    )
}

export default page