import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Check, X } from 'lucide-react';
import { DispensesRecord, User } from '@/types';
import Modal from './Modal';
import Loading from '@/app/loading';
import axios from 'axios';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { isAuthenticated } from '@/lib/auth';
import { BASE_URL } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import OnlyAllowed from './OnlyAllowed';
import { toast } from '@/hooks/use-toast';

interface FuelRecordCardProps {
    record: DispensesRecord;
}

const FuelRecordCard: React.FC<FuelRecordCardProps> = ({ record }) => {
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [showAlert, setShowAlert] = useState<boolean>(false);
    const [alertTitle, setAlertTitle] = useState("");
    const [alertMessage, setAlertMessage] = useState("");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [editing, setEditing] = useState<boolean>(false);
    const [updatedRecord, setUpdatedRecord] = useState<DispensesRecord>(record);
    const [user, setUser] = useState<User>()
    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
    };
    useEffect(() => {
        checkAuth();
        setUser(JSON.parse(localStorage.getItem('adminUser')!))
    }, []);

    // Add useEffect to update updatedRecord when record changes
    useEffect(() => {
        setUpdatedRecord(record);
    }, [record]);

    // Function to handle image click
    const openImageModal = (image: string) => {
        setSelectedImage(image);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedImage(null);
    };

    // Function to handle the update
    const handleUpdate = async () => {
        setLoading(true)
        if (!updatedRecord || !record) return;

        // Create an object to hold the fields that have changed
        const updatedFields: Partial<DispensesRecord> = {};

        // Compare fields and add to updatedFields if they are different
        if (updatedRecord.driverName !== record.driverName) {
            updatedFields.driverName = updatedRecord.driverName;
        }
        if (updatedRecord.driverId !== record.driverId) {
            updatedFields.driverId = updatedRecord.driverId;
        }
        if (updatedRecord.vehicleNumber !== record.vehicleNumber) {
            updatedFields.vehicleNumber = updatedRecord.vehicleNumber;
        }
        if (updatedRecord.fuelQuantity !== record.fuelQuantity) {
            updatedFields.fuelQuantity = updatedRecord.fuelQuantity;
        }
        if (updatedRecord.gpsLocation !== record.gpsLocation) {
            updatedFields.gpsLocation = updatedRecord.gpsLocation;
        }

        // Proceed only if there are changes
        if (Object.keys(updatedFields).length === 0) {
            alert('No changes detected.');
            setShowAlert(true)
            setAlertTitle("Suspicious Update")
            setAlertMessage("You can't update without any change in details")
            setLoading(false)
            return;
        }

        try {
            let response = await axios.patch(`${BASE_URL}/listDispenses/update/${record._id}`, updatedFields); // https://bowser-backend-2cdr.onrender.com/listDispenses/update
            setShowAlert(true)
            setAlertTitle(response.data.heading)
            setAlertMessage(response.data.message)
            setEditing(false);
        } catch (error: any) {
            console.error('Error updating record:', error);
            setShowAlert(true)
            setAlertTitle(error.heading)
            setAlertMessage(error.message)
            console.log(`Error updating record: ${error.message}`);
        } finally {
            setLoading(false)
        }
    };

    const handleDelete = async () => {
        setLoading(true)
        try {
            await axios.delete(`${BASE_URL}/listDispenses/delete/${record._id}`); //https://bowser-backend-2cdr.onrender.com
            setShowAlert(true);
            setAlertTitle("Success");
            setAlertMessage("Deleted Successfully");
            setEditing(false);
            window.history.back()
        } catch (error) {
            console.error('Error deleting Trip Sheet:', error);
            alert(`Error deleting Trip Sheet: ${error}`);
        } finally {
            setLoading(false)
        }
    }

    const verifyOne = async (id: string) => {
        try {
            setLoading(true)
            let response = await axios.patch(`${BASE_URL}/listDispenses/verify/${id}`, { by: { id: user?.userId, name: user?.name } })
            if (response.status == 200) {
                setUpdatedRecord((record) =>
                    record._id === id ? { ...record, verified: { status: true } } : record
                )
                toast({ title: response.data.heading, description: response.data.message, variant: "success" });
            }
        } catch (err) {
            if (err instanceof Error) {
                toast({ title: "Error", description: err.message, variant: "destructive" });
            } else {
                toast({ title: "Error", description: "An unknown error occurred", variant: "destructive" });
            }
        } finally {
            setLoading(true)
        }
    }

    return (
        <>
            {loading && <Loading />}
            <Card className="shadow-lg mt-8 p-4">
                {/* Header */}
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        Caregory: {record?.category} {record.category == "Attatch" && `, Party: ${record.party}`}{record.category == "Bulk Sale" && `, Vendor: ${record.party}`}
                    </CardTitle>
                </CardHeader>

                {/* Content */}
                <CardContent>
                    <div className='my-3'>
                        <span>Receaver: {editing ? (
                            <div className='flex flex-wrap md:flex-nowrap gap-3'>
                                <Input
                                    placeholder='Receaver Name'
                                    value={updatedRecord?.driverName}
                                    onChange={(e) => {
                                        setUpdatedRecord({ ...updatedRecord, driverName: e.target.value });
                                    }}
                                />
                                {record.category == "Own" && <Input
                                    placeholder='Driver ITPLId'
                                    value={updatedRecord?.driverId}
                                    onChange={(e) => {
                                        setUpdatedRecord({ ...updatedRecord, driverId: e.target.value });
                                    }}
                                />}
                                <Input
                                    placeholder='Receaver Phone No'
                                    value={updatedRecord?.driverMobile}
                                    onChange={(e) => {
                                        setUpdatedRecord({ ...updatedRecord, driverMobile: e.target.value });
                                    }}
                                />
                            </div>
                        ) : (
                            `${updatedRecord?.driverName}${updatedRecord?.driverId ? (" - " + updatedRecord?.driverId) : ""}, Mobile No.: ${updatedRecord?.driverMobile}`
                        )}</span>
                    </div>
                    {(updatedRecord || record) &&
                        <>
                            <div className="mb-4">
                                {record.vehicleNumber && <p className="text-foreground text-md"><strong>Vehicle Number:</strong> {editing ? (
                                    <Input
                                        placeholder='Vehicle Number'
                                        value={updatedRecord?.vehicleNumber}
                                        onChange={(e) => {
                                            setUpdatedRecord({ ...updatedRecord, vehicleNumber: e.target.value });
                                        }}
                                    />
                                ) : (
                                    updatedRecord?.vehicleNumber
                                )}</p>}
                                <div className="flex flex-col gap-3 mt-2">
                                    {record?.category == "Bulk Sale" && "Saling Point"}
                                    <img className="rounded-md w-32 h-32 object-cover" src={`${record?.vehicleNumberPlateImage}`} alt="Vehicle Plate"
                                        onClick={() => openImageModal(record?.vehicleNumberPlateImage || '')}
                                    />
                                </div>
                                {record.category == "Own" && <p className='my-3 text-foreground text-sm'>
                                    <strong>Odo Meter:</strong> {editing ? (
                                        <Input
                                            placeholder='Odo Meter'
                                            value={updatedRecord?.odometer}
                                            onChange={((e) => {
                                                setUpdatedRecord({ ...updatedRecord, odometer: e.target.value })
                                            })}
                                        />
                                    ) : `${record.odometer}`}
                                </p>}
                            </div>

                            <div className="mb-4">
                                <h2 className="font-semibold text-md">Dispense Details</h2>
                                <p className="text-sm"><strong>Quantity:</strong> {editing ? (
                                    <Input
                                        placeholder='Quantity'
                                        value={updatedRecord?.fuelQuantity}
                                        onChange={(e) => {
                                            setUpdatedRecord({ ...updatedRecord, fuelQuantity: e.target.value });
                                        }}
                                    />
                                ) : (
                                    `${updatedRecord?.fuelQuantity} Liter - ${updatedRecord?.quantityType}`
                                )}</p>
                                <p className="text-sm"><strong>Date & Time:</strong> {formatDate(record?.fuelingDateTime!)}</p>
                                <p className="flex items-center text-sm">
                                    <MapPin className="mr-1 w-4 h-4" />
                                    {editing ? (
                                        <Input
                                            placeholder='Location of Fueling'
                                            value={updatedRecord?.gpsLocation}
                                            onChange={(e) => {
                                                setUpdatedRecord({ ...updatedRecord, gpsLocation: e.target.value });
                                            }}
                                        />
                                    ) : (
                                        updatedRecord?.gpsLocation
                                    )}
                                </p>
                                <h2 className="font-semibold text-gray-600 text-md">Bowser Details</h2>
                                <p className="text-gray-600 text-sm"><strong>Registration Number:</strong> {record?.bowser.regNo || "Error"}</p>
                                <p className="text-gray-600 text-sm"><strong>Driver Name:</strong> {record?.bowser.driver.name}</p>
                                <p className="text-gray-600 text-sm"><strong>Driver Phone:</strong> {record?.bowser.driver.phoneNo}</p>
                            </div>

                            <div className="flex space-x-4">
                                <div>
                                    <h2 className="font-semibold text-md">Fuel Meter & Slip Image/s</h2>
                                    <div className="flex gap-3">
                                        {record?.fuelMeterImage.map((img, index) => (
                                            <img
                                                width={128}
                                                height={128}
                                                key={index}
                                                src={img}
                                                alt="Fuel Meter"
                                                className="rounded-md w-32 h-32 object-cover"
                                                onClick={() => openImageModal(img)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {record?.slipImage && <div>
                                    <h2 className="font-semibold text-md">Slip Image</h2>
                                    {record?.slipImage && <img
                                        width={128}
                                        height={128}
                                        src={record?.slipImage}
                                        alt="Slip"
                                        className="rounded-md w-32 h-32 object-cover"
                                        onClick={() => openImageModal(record.slipImage)}
                                    />}
                                </div>}
                            </div>

                            {record?.allocationAdmin && (
                                <p className="mt-4 text-gray-500 text-sm">
                                    Allocated by: {`${updatedRecord?.allocationAdmin?.name || ''} Id: ${updatedRecord?.allocationAdmin?.id || ''}`}
                                </p>
                            )}

                            <div className="flex items-center mt-6 recordVerificationStatus">
                                <Label htmlFor="verification" >Record Verification Status: </Label>{
                                    record?.verified ? (
                                        <Badge variant="succes" className="flex items-center ml-2 w-28 h-6">
                                            <Check className="mr-1 w-4 h-4" /> Verified
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive" className="flex items-center ml-2 w-28 h-6">
                                            <X className="mr-1 w-4 h-4" /> Not Verified
                                        </Badge>
                                    )
                                }
                            </div>
                            {!record?.verified?.status && !editing ? <Button onClick={() => { verifyOne(String(record._id)) }} variant="outline" className='mt-3 w-full'>Verify</Button> : null}
                        </>
                    }
                </CardContent>

                {/* Footer */}
                <CardFooter className="flex gap-6 mt-4">
                    <div className="flex justify-between space-x-2 w-full">
                        <Button className='w-[30%]' variant="secondary" onClick={() => setEditing(!editing)}>
                            {editing ? 'Cancel Editing' : 'Edit'}
                        </Button>
                        {editing && (
                            <>
                                <Button className='w-[30%]' variant="default" onClick={handleUpdate}>
                                    Save
                                </Button>
                                <OnlyAllowed allowedRoles={["Admin"]}>
                                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>Delete this record</Button>
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
                                </OnlyAllowed>
                            </>
                        )}
                    </div>
                </CardFooter>
                {/* Modal for Image */}
                <Modal isOpen={isModalOpen} onClose={closeModal}>
                    {selectedImage && (
                        <img
                            src={selectedImage}
                            alt="Enlarged"
                            className="w-full h-auto object-contain"
                        />
                    )}
                </Modal>
            </Card>
            {showAlert && (
                <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {alertMessage}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogAction onClick={() => setShowAlert(false)}>Close</AlertDialogAction>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
};

export default FuelRecordCard;
