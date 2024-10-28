"use client"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DispensesRecord } from '@/types';

const VehicleDispensesPage = () => {
    const [records, setRecords] = useState<DispensesRecord[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<DispensesRecord | null>(null);
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                const response = await axios.get('http://localhost:5000/verifyFormData');
                setRecords(response.data);
            } catch (error) {
                console.error('Error fetching records:', error);
            }
        };

        fetchRecords();
    }, []);

    const handleSelectRecord = (record: DispensesRecord) => {
        setSelectedRecord(record);
        setIsVerified(record.verified);
    };

    const handleUpdateRecord = async () => {
        if (selectedRecord) {
            try {
                const response = await axios.put(`http://localhost:5000/verifyFormData/${selectedRecord._id}`, {
                    ...selectedRecord,
                    verified: isVerified,
                });
                setRecords((prevRecords) =>
                    prevRecords.map((rec) => (rec._id === response.data._id ? response.data : rec))
                );
                setSelectedRecord(null);
            } catch (error) {
                console.error('Error updating record:', error);
            }
        }
    };

    return (
        <div>
            <h1>Vehicle Dispenses</h1>
            <ul>
                {records.map((record, index) => (
                    <>
                        <li key={index} onClick={() => handleSelectRecord(record)}>
                            {record.vehicleNumber} - Verified: {record.verified ? 'Yes' : 'No'}
                            <img src={record.vehicleNumberPlateImage} alt={record.vehicleNumber} />
                        </li>
                    </>
                ))}
            </ul>
            {selectedRecord && (
                <div>
                    <h2>Edit Record</h2>
                    <p>Vehicle Number: {selectedRecord.vehicleNumber}</p>
                    <label>
                        Verified:
                        <input
                            type="checkbox"
                            checked={isVerified}
                            onChange={(e) => setIsVerified(e.target.checked)}
                        />
                    </label>
                    <button onClick={handleUpdateRecord}>Submit</button>
                </div>
            )}
        </div>
    );
};

export default VehicleDispensesPage;

