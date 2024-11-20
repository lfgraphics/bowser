import * as React from 'react';
import { useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
// import { useTheme } from '@react-navigation/native';

interface DispensesRecord {
    _id: string;
    fuelingDateTime: string;
    vehicleNumber: string;
    fuelQuantity: string;
    bowser: {
        regNo: string;
    };
    driverName: string;
    gpsLocation: string;
    verified: boolean;
    vehicleNumberPlateImage: string;
    fuelMeterImage: string;
    slipImage: string;
}

const FuelingRecords: React.FC = () => {
    const [tripSheetId, setTripSheetId] = useState<string | null>(null);
    const [records, setRecords] = useState<DispensesRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    // const { colors } = useTheme();

    const getUserTripSheetId = async () => {
        try {
            const userDataString = await AsyncStorage.getItem('userData');
            const userData = userDataString ? JSON.parse(userDataString) : null;
            const tripSheetId = userData ? userData['Trip Sheet Id'] : null;
            setTripSheetId(tripSheetId);
        } catch (error) {
            console.error('Error fetching user data from AsyncStorage:', error);
        }
    };

    const fetchRecords = async () => {
        if (!tripSheetId) return;
        setLoading(true);

        try {
            const baseUrl = 'https://bowser-backend-2cdr.onrender.com' // 'http://192.168.137.1:5000'; // https://bowser-backend-2cdr.onrender.com
            const response = await axios.get(`${baseUrl}/listDispenses`, {
                params: { tripSheetId },
            });

            setRecords(response.data.records);
        } catch (error) {
            console.error('Error fetching records:', error);
            Alert.alert('Error', 'Failed to fetch fueling records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getUserTripSheetId();
    }, []);

    useEffect(() => {
        if (tripSheetId) {
            fetchRecords();
        }
    }, [tripSheetId]);

    return (
        <ThemedView style={[styles.scrollThemedView,]}>
            <ThemedText style={[styles.title,]}>Your Fueling Records</ThemedText>

            {loading ? (
                <ActivityIndicator size="large" />
            ) : (
                <ScrollView style={styles.scrollThemedView}>
                    {records.length > 0 &&
                        <ThemedText style={[styles.secondaryTitle,]}>
                            Total Fueled Quantity: {records.reduce((total, record) => total + Number(record.fuelQuantity), 0).toFixed(2)} L
                        </ThemedText>
                    }
                    {records.length > 0 ? (
                        records.map((record) => (
                            <ThemedView style={[styles.modalItem,]} key={record._id}>
                                <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>Date:</ThemedText> {record.fuelingDateTime.split(' ')[0].replace(',', '')}</ThemedText>
                                <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>Vehicle No.:</ThemedText> {record.vehicleNumber}</ThemedText>
                                <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>Driver Name:</ThemedText> {record.driverName}</ThemedText>
                                <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>Fuel Quantity:</ThemedText> {record.fuelQuantity}</ThemedText>
                                <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>GPS Location:</ThemedText> {record.gpsLocation}</ThemedText>
                                <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>Verified:</ThemedText> {record.verified ? "Yes" : "No"}</ThemedText>
                            </ThemedView>
                        ))
                    ) : (
                        <ThemedText style={[styles.noRecordsText,]}>No records found.</ThemedText>
                    )}
                </ScrollView >
            )}
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        maxHeight: 400,
        padding: 16,
    },
    title: {
        fontSize: 24,
        alignSelf: 'center',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    secondaryTitle: {
        fontSize: 18,
        alignSelf: 'center',
        fontWeight: 'bold',
        marginBottom: 16,
    },
    noRecordsText: {
        textAlign: 'center',
        fontSize: 16,
    },
    modalContainer: {
        borderTopEndRadius: 4,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    closeButton: {
        // backgroundColor: '#0a7ea4',
        width: 300,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: 12,
        borderRadius: 4,
        borderBottomColor: 'white'
    },
    closeButtonText: {
        fontWeight: 'bold',
    },
    modalItem: {
        padding: 4,
        marginBottom: 8,
        borderRadius: 8,
        borderBottomColor: 'white',
        borderBottomWidth: 1
    },
    modalText: {
        fontSize: 16,
        marginBottom: 8,
    },
    label: {
        fontWeight: 'bold',
    },
    scrollThemedView: {
        borderRadius: 8,
        padding: 10,
        maxHeight: 300,
        width: '100%',
    },
});

export default FuelingRecords;
