"use client"
import { BASE_URL } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { WholeTripSheet } from "@/types";
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Modal from '@/components/Modal';
import Loading from '@/app/loading';
import TripCalculationModal from '@/components/exclusive/TripCalculationModal';
import { Button } from '@/components/ui/button';

interface WholeTripSheetCardProps {
    record: WholeTripSheet;
}

const WholeTripSheetCard: React.FC<WholeTripSheetCardProps> = ({ record }) => {
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

    return (
        <>
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
                    <Separator className='my-3' />
                    {record.dispenses && <>
                        <strong>Dispenses: </strong>{record.dispenses.length}
                        <p>Total Fuel Quantity Dispensed: {record.dispenses.reduce((acc, curr) => acc + curr.fuelQuantity, 0)}</p>
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
                            <strong>Qty on return</strong>{record.settelment.details.totalQty}
                            <strong>Pump Reading on return</strong>{record.settelment.details.pumpReading}
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

export const page = ({ params }: { params: { id: string } }) => {
    const [loading, setLoading] = useState(true);
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
                    orderId: "string"
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
                pumpSlips: []
            },
            quantityByDip: 0,
            quantityBySlip: 0
        },
        addition: [{
            sheetId: {
                _id: "string",
                regNo: "string",
                odoMeter: 0,
                totalLoadQuantityByDip: 0,
                totalLoadQuantityBySlip: 0,
                bccAuthorizedOfficer: {
                    id: "string",
                    name: "string",
                    orderId: "string"
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
                pumpSlips: []
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
                    saleryDays: 0,
                    foodingDays: 0,
                    rewardTrips: 0,
                    hsdRateFor: 0,
                    tollTax: 0,
                    borderOtherExp: 0,
                    unload: 0,
                    hsdPerKm: 0,
                }
            },
            settled: false
        },
        posted: false
    }

    const [record, setRecord] = useState<WholeTripSheet>(dummyRecord);
    useEffect(() => {
        const fetchRecords = async () => {
            try {
                setLoading(true)
                const response = await axios.get(`${BASE_URL}/tripSheet/${params.id}`);
                setRecord(response.data);
                console.log(response.data)
            } catch (error) {
                console.error('Error fetching records:', error);
            } finally {
                setLoading(false)
            }
        };

        fetchRecords();
    }, [params.id]);

    const handlePrint = () => {
        const printURL = `${window.location.origin}/tripsheets/settle/print/${params.id}`; // Your print route
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