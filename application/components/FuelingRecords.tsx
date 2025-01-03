import * as React from 'react';
import { useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { TripSheet } from '@/src/types/models';
import { Link } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
// import { useTheme } from '@react-navigation/native';

interface DispensesRecord {
    _id: string;
    fuelingDateTime: Date;
    vehicleNumber: string;
    fuelQuantity: string;
    bowser: {
        regNo: string;
    };
    category: string;
    party: string;
    driverName: string;
    gpsLocation: string;
    verified: boolean;
    vehicleNumberPlateImage: string;
    fuelMeterImage: string;
    slipImage: string;
}

const FuelingRecords: React.FC = () => {
    const [tripSheetId, setTripSheetId] = useState<number | null>(null);
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
            // Alert.alert('Error', 'Failed to fetch fueling records');
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
            <ThemedText style={[styles.title,]}>इस ट्रिप पर दिए गए तेल</ThemedText>
            {records.length > 0 &&
                <ThemedText style={[styles.secondaryTitle,]}>
                    कुल {records.reduce((total, record) => total + Number(record.fuelQuantity), 0).toFixed(2)} लीटर तेल दिया
                </ThemedText>
            }
            {loading ? (
                <ActivityIndicator size="large" />
            ) : (
                <ScrollView style={styles.scrollThemedView}>
                    {records.length > 0 ? (
                        records.map((record) => (
                            <ThemedView style={[styles.modalItem,]} key={record._id}>
                                <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>तारीख़:</ThemedText> {`${new Date(record.fuelingDateTime).toISOString().split('T')[0].split('-').reverse().map((v, i) => i === 2 ? v.slice(-2) : v).join('-')}`}</ThemedText>
                                <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>कैटेगरी:</ThemedText> {record.category}</ThemedText>
                                {!(record.category == "Own") && <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>{record.category == "Bulk Sale" ? "पार्टी" : "वेंडर"}:</ThemedText> {record.party}</ThemedText>}
                                {record.category !== "Bulk Sale" && <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>गाड़ी नम्बर:</ThemedText> {record.vehicleNumber}</ThemedText>}
                                <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>{record.category === "Bulk Sale" ? "मैनेजर" : "ड्राईवर"} का नाम:</ThemedText> {record.driverName}</ThemedText>
                                <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>तेल दिया:</ThemedText> {record.fuelQuantity} लीटर</ThemedText>
                                <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>तेल देने की जगह:</ThemedText> {record.gpsLocation}</ThemedText>
                                <ThemedText style={[styles.modalText,]}><ThemedText style={styles.label}>रिकॉर्ड सत्यापित हुआ:</ThemedText> {record.verified ? "हाँ" : "नहीं"}</ThemedText>
                            </ThemedView>
                        ))
                    ) : (
                        <ThemedText style={[styles.noRecordsText]}>कोई भी रिकॉर्ड मौजूद नहीं|</ThemedText>
                    )}

                </ScrollView >
            )}
            <ThemedText style={[styles.noRecordsText]}>एक गाड़ी का रिकॉर्ड ऑनलाइन ना भेजने पर 50 रुपया पेनाल्टी लग सकती है|</ThemedText>
            <Link style={styles.button} href={'/tripsheet'}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <ThemedText style={{ color: 'white' }}>
                        ट्रिप शीट डीटेल्स
                    </ThemedText>
                    <MaterialIcons name="table-chart" size={24} color="white" style={{ marginHorizontal: 10 }} />
                </View>
            </Link>
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    button: {
        width: '70%',
        padding: 15,
        marginVertical: 10,
        backgroundColor: '#0a7ea4',
        borderRadius: 5,
        alignItems: 'center',
        textAlign: 'center',
        alignSelf:"center",
        paddingHorizontal: 20,
        color: 'white'
    },
    container: {
        flex: 1,
        maxHeight: 400,
        padding: 16,
    },
    title: {
        fontSize: 24,
        alignSelf: 'center',
        fontWeight: 'bold',
        paddingVertical: 8,
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
        color: 'red',
        paddingVertical: 8
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
        maxHeight: 470,
        width: '100%',
    },
});

export default FuelingRecords;
