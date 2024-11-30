import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Check, X, User2Icon } from 'lucide-react';
import { DispensesRecord } from '@/types';
import Modal from './Modal';
import Loading from '@/app/loading';
import axios from 'axios';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { isAuthenticated } from '@/lib/auth';
import { BASE_URL } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface FuelRecordCardProps {
    record?: DispensesRecord;
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
    const [updatedRecord, setUpdatedRecord] = useState<DispensesRecord | undefined>(record);
    const [superAdmin, setSuperAdmin] = useState<boolean>(false);

    const checkAuth = () => {
        const authenticated = isAuthenticated();
        if (!authenticated) {
            window.location.href = '/login';
        }
        if (authenticated) {
            let user = JSON.parse(localStorage.getItem("adminUser")!);

            if (user && user.roles) {
                const rolesString = user.roles.toString();
                if (rolesString.includes("Super Admin")) {
                    setSuperAdmin(true)
                } else {
                    setSuperAdmin(false)
                }
            } else {
                console.error("Roles not found in user data.");
            }
        }
    };
    useEffect(() => {
        checkAuth();
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
        if (updatedRecord.verified !== record.verified || (updatedRecord.verified === false && !record.verified)) {
            updatedFields.verified = updatedRecord.verified;
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

    return (
        <>
            {loading && <Loading />}
            <Card className="p-4 shadow-lg mt-4">
                {/* Header */}
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <User2Icon className="w-5 h-5" />
                        <span>Vehicle Driver: {editing ? (
                            <Input
                                value={`${updatedRecord?.driverName} - ${updatedRecord?.driverId}`}
                                onChange={(e) => {
                                    const [name, id] = e.target.value.split(' - ');
                                    setUpdatedRecord({ ...updatedRecord, driverName: name, driverId: id });
                                }}
                            />
                        ) : (
                            `${updatedRecord?.driverName} - ${updatedRecord?.driverId}`
                        )}</span>
                    </CardTitle>
                </CardHeader>

                {/* Content */}
                <CardContent>
                    {(updatedRecord || record) &&
                        <>
                            <div className="mb-4">
                                <h2 className="text-md font-semibold">Vehicle Details</h2>
                                <p className="text-sm text-foreground"><strong>Vehicle Number:</strong> {editing ? (
                                    <Input
                                        value={updatedRecord?.vehicleNumber}
                                        onChange={(e) => {
                                            setUpdatedRecord({ ...updatedRecord, vehicleNumber: e.target.value });
                                        }}
                                    />
                                ) : (
                                    updatedRecord?.vehicleNumber
                                )}</p>
                                <div className="flex space-x-4 mt-2">
                                    <img className="w-32 h-32 object-cover rounded-md" src={`${record?.vehicleNumberPlateImage}`} alt="Vehicle Plate"
                                        onClick={() => openImageModal(record?.vehicleNumberPlateImage || '')}
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <h2 className="text-md font-semibold">Fueling Details</h2>
                                <p className="text-sm text-gray-600"><strong>Quantity:</strong> {editing ? (
                                    <Input
                                        value={updatedRecord?.fuelQuantity}
                                        onChange={(e) => {
                                            setUpdatedRecord({ ...updatedRecord, fuelQuantity: e.target.value });
                                        }}
                                    />
                                ) : (
                                    `${updatedRecord?.fuelQuantity} Liter - ${updatedRecord?.quantityType}`
                                )}</p>
                                <p className="text-sm text-gray-600"><strong>Date & Time:</strong> {formatDate(record?.fuelingDateTime)}</p>
                                <h2 className="text-md font-semibold">Bowser Details</h2>
                                <p className="text-sm text-gray-600"><strong>Registration Number:</strong> {record?.bowser.regNo || "Not Registered"}</p>
                                <p className="text-sm text-gray-600"><strong>Driver:</strong> {record?.bowser.driver.name}</p>
                                <p className="text-sm text-gray-600"><strong>Phone:</strong> {record?.bowser.driver.phoneNo}</p>
                            </div>

                            <div className="mb-4">
                                <h2 className="text-md font-semibold">Location</h2>
                                <p className="text-sm text-gray-600 flex items-center">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {editing ? (
                                        <Input
                                            value={updatedRecord?.gpsLocation}
                                            onChange={(e) => {
                                                setUpdatedRecord({ ...updatedRecord, gpsLocation: e.target.value });
                                            }}
                                        />
                                    ) : (
                                        updatedRecord?.gpsLocation
                                    )}
                                </p>
                            </div>
                            <div className="flex space-x-4">
                                <div>
                                    <h2 className="text-md font-semibold">Fuel Meter Image</h2>
                                    <div className="flex gap-3">
                                        {record?.fuelMeterImage.map((img, index) => (
                                            <img
                                                key={index}
                                                src={img}
                                                alt="Fuel Meter"
                                                className="w-32 h-32 object-cover rounded-md"
                                                onClick={() => openImageModal(img)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-md font-semibold">Slip Image</h2>
                                    {record?.slipImage && <img
                                        src={record?.slipImage}
                                        alt="Slip"
                                        className="w-32 h-32 object-cover rounded-md"
                                        onClick={() => openImageModal(record.slipImage)}
                                    />}
                                </div></div>

                            <div className="recordVerificationStatus mt-6 flex items-center">
                                <Label htmlFor="verification" >Record Verification Status: </Label>{editing ? (
                                    <Checkbox
                                        id='verification'
                                        className='ml-3'
                                        checked={updatedRecord?.verified}
                                        onCheckedChange={(checked) => {
                                            setUpdatedRecord({ ...updatedRecord, verified: checked });
                                        }}
                                    />
                                ) : (
                                    updatedRecord?.verified ? (
                                        <Badge variant="succes" className="ml-2 flex items-center h-6 w-28">
                                            <Check className="w-4 h-4 mr-1" /> Verified
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive" className="ml-2 flex items-center h-6 w-28">
                                            <X className="w-4 h-4 mr-1" /> Not Verified
                                        </Badge>
                                    )
                                )}
                            </div>
                        </>
                    }
                </CardContent>

                {/* Footer */}
                <CardFooter className="mt-4 flex justify-between">
                    <div className="flex space-x-2">
                        <Button variant="ghost" onClick={() => setEditing(!editing)}>
                            {editing ? 'Cancel' : 'Edit'}
                        </Button>
                        {editing && (
                            <>
                                <Button variant="default" onClick={handleUpdate}>
                                    Save
                                </Button>
                                {superAdmin && <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
                                </AlertDialog>}
                            </>
                        )}
                    </div>
                    {record?.allocationAdmin && (
                        <p className="text-sm text-gray-500">
                            Allocated by: {`${updatedRecord?.allocationAdmin?.name || ''} Id: ${updatedRecord?.allocationAdmin?.userId || ''}`}
                        </p>
                    )}
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
