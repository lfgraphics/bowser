import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert, useColorScheme, useWindowDimensions, FlatList, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useTheme } from '@react-navigation/native';

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
    const [selectedRecord, setSelectedRecord] = useState<DispensesRecord | null>(null);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const { colors } = useTheme();

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

    // const handleViewDetails = (record: DispensesRecord) => {
    //     setSelectedRecord(record);
    //     setModalVisible(true);
    // };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedRecord(null);
    };

    const renderDriverItem = ({ item }: { item: DispensesRecord }) => (
        <View style={[styles.modalItem, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalText, { color: colors.text }]}><Text style={styles.label}>Date:</Text> {item.fuelingDateTime}</Text>
            <Text style={[styles.modalText, { color: colors.text }]}><Text style={styles.label}>Vehicle No.:</Text> {item.vehicleNumber}</Text>
            <Text style={[styles.modalText, { color: colors.text }]}><Text style={styles.label}>Driver Name:</Text> {item.driverName}</Text>
            <Text style={[styles.modalText, { color: colors.text }]}><Text style={styles.label}>Fuel Quantity:</Text> {item.fuelQuantity}</Text>
            <Text style={[styles.modalText, { color: colors.text }]}><Text style={styles.label}>GPS Location:</Text> {item.gpsLocation}</Text>
            <Text style={[styles.modalText, { color: colors.text }]}>
                <Text style={styles.label}>Verified:</Text> {item.verified ? "Yes" : "No"}
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>Your Fueling Records</Text>

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} />
            ) : (
                <ScrollView style={styles.scrollView}>
                    {records.length > 0 &&
                        <Text style={[styles.secondaryTitle, { color: colors.text }]}>
                            Total Fueled Quantity: {records.reduce((total, record) => total + Number(record.fuelQuantity), 0).toFixed(2)} L
                        </Text>
                    }
                    {records.length > 0 ? (
                        records.map((record) => (
                            <View style={[styles.modalItem, { backgroundColor: colors.card }]} key={record._id}>
                                <Text style={[styles.modalText, { color: colors.text }]}><Text style={styles.label}>Date:</Text> {record.fuelingDateTime.split(' ')[0].replace(',', '')}</Text>
                                <Text style={[styles.modalText, { color: colors.text }]}><Text style={styles.label}>Vehicle No.:</Text> {record.vehicleNumber}</Text>
                                <Text style={[styles.modalText, { color: colors.text }]}><Text style={styles.label}>Driver Name:</Text> {record.driverName}</Text>
                                <Text style={[styles.modalText, { color: colors.text }]}><Text style={styles.label}>Fuel Quantity:</Text> {record.fuelQuantity}</Text>
                                <Text style={[styles.modalText, { color: colors.text }]}><Text style={styles.label}>GPS Location:</Text> {record.gpsLocation}</Text>
                                <Text style={[styles.modalText, { color: colors.text }]}><Text style={styles.label}>Verified:</Text> {record.verified ? "Yes" : "No"}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={[styles.noRecordsText, { color: colors.text }]}>No records found.</Text>
                    )}
                </ScrollView>
            )}

            {/* Modal for displaying details */}
            <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={closeModal}>
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                        <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
                    </TouchableOpacity>

                    {selectedRecord && (
                        <FlatList
                            data={[selectedRecord]}
                            renderItem={renderDriverItem}
                            keyExtractor={(item) => item._id}
                        />
                    )}
                </View>
            </Modal>
        </View>
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
        alignSelf:'center',
        fontWeight: 'bold',
        marginBottom: 16,
    },
    secondaryTitle: {
        fontSize: 18,
        alignSelf:'center',
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
        marginBottom: 16,
    },
    closeButtonText: {
        fontWeight: 'bold',
    },
    modalItem: {
        padding: 16,
        marginBottom: 8,
        borderRadius: 8,
    },
    modalText: {
        fontSize: 16,
        marginBottom: 8,
    },
    label: {
        fontWeight: 'bold',
    },
    scrollView: {
        maxHeight: 300,
        width: '100%',
    },
});

export default FuelingRecords;
