import { TripSheet } from '@/src/types/models';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ActivityIndicator, ScrollView, StyleSheet, Image, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { baseUrl } from '@/src/utils/helpers';

const Tripsheet: React.FC = () => {
    const [tripSheet, setTripSheet] = useState<TripSheet | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [tripSheetId, setTripSheetId] = useState<number | null>(null);
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
    useEffect(() => {
        getUserTripSheetId();
    }, [])
    const fetchTripDetails = async () => {
        try {
            if (!tripSheetId) return;
            setLoading(true);
            const response = await axios.get(`${baseUrl}/tripSheet/tripSheetId/${tripSheetId}`);

            setTripSheet(response.data);
            console.log(response.data);
        } catch (error) {
            console.error('Error fetching records:', error);
            // Alert.alert('Error', 'Failed to fetch fueling records');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (tripSheetId) fetchTripDetails();
    }, [tripSheetId]);

    return (
        <ThemedView style={[{ marginBottom: 4 }]}>
            {/* <ThemedText>Test</ThemedText> */}
            {loading ? (
                <ActivityIndicator size="large" />
            ) : (
                <ScrollView style={[{ padding: 16 }]}>
                    {tripSheet && (
                        <ThemedView>
                            <ThemedText style={styles.title}>Trip Sheet Details</ThemedText>
                            <ThemedText>Registration No: {tripSheet.bowser.regNo}</ThemedText>
                            <ThemedText>Odometer: {tripSheet.loading.sheetId.odoMeter}</ThemedText>
                            <ThemedText>Total Load Quantity by Dip: {tripSheet.loading.quantityByDip}</ThemedText>
                            
                            <ThemedText>Total Load Quantity by Slip: {tripSheet.loading.quantityBySlip}</ThemedText>
                            <ThemedText>Created At: {new Date(tripSheet.createdAt).toLocaleString()}</ThemedText>
                            <ThemedText>Total Sold: {tripSheet.saleQty}</ThemedText>
                            <ThemedText>Balance: {tripSheet.balanceQty}</ThemedText>
                            <ThemedText>Balance Qty by Slip: {tripSheet.balanceQtyBySlip}</ThemedText>

                            {/* Additional details */}
                            <ThemedText style={styles.subtitle}>Loading Information</ThemedText>
                            <ThemedText>Quantity by Dip: {tripSheet.loading.quantityByDip}</ThemedText>
                            <ThemedText>Quantity by Slip: {tripSheet.loading.quantityBySlip}</ThemedText>

                            {/* Chamberwise Dip List Before */}
                            <ThemedText style={styles.subtitle}>Chamberwise Dip List Before</ThemedText>
                            {tripSheet.loading.sheetId.chamberwiseDipListBefore.map((chamber, index) => (
                                <ThemedView key={index}>
                                    <ThemedText>{chamber.chamberId}</ThemedText>
                                    <ThemedText>Level Height: {chamber.levelHeight}</ThemedText>
                                    <ThemedText>Quantity: {chamber.qty.toFixed(2)}</ThemedText>
                                </ThemedView>
                            ))}

                            {/* Chamberwise Dip List After */}
                            <ThemedText style={styles.subtitle}>Chamberwise Dip List After</ThemedText>
                            {tripSheet.loading.sheetId.chamberwiseDipListAfter.map((chamber, index) => (
                                <ThemedView key={index}>
                                    <ThemedText>{chamber.chamberId}</ThemedText>
                                    <ThemedText>Level Height: {chamber.levelHeight}</ThemedText>
                                    <ThemedText>Quantity: {chamber.qty.toFixed(2)}</ThemedText>
                                </ThemedView>
                            ))}

                            {/* Chamberwise Seal List */}
                            <ThemedText style={styles.subtitle}>Chamberwise Seal List</ThemedText>
                            {tripSheet.loading.sheetId.chamberwiseSealList.map((seal, index) => (
                                <ThemedView key={index}>
                                    <ThemedText>{seal.chamberId}</ThemedText>
                                    <ThemedText>Seal ID: {seal.sealId}</ThemedText>
                                    <ThemedText>Seal Photo:</ThemedText>
                                    <Image source={{ uri: seal.sealPhoto }} style={styles.sealImage} />
                                </ThemedView>
                            ))}
                            {tripSheet.addition?.length && tripSheet.addition?.length > 0 &&
                                <ThemedText style={styles.subtitle}>Addition/Reload Information</ThemedText>
                                && tripSheet.addition.map((addition, index) => (
                                    <ThemedView key={index}>
                                        <ThemedText>Quantity by Dip: {addition.quantityByDip}</ThemedText>
                                        <ThemedText>Quantity by Slip: {addition.quantityBySlip}</ThemedText>

                                        {/* Chamberwise Dip List Before */}
                                        <ThemedText style={styles.subtitle}>Chamberwise Dip List Before</ThemedText>
                                        {addition.sheetId.chamberwiseDipListBefore.map((chamber, index) => (
                                            <ThemedView key={index}>
                                                <ThemedText>{chamber.chamberId}</ThemedText>
                                                <ThemedText>Level Height: {chamber.levelHeight}</ThemedText>
                                                <ThemedText>Quantity: {chamber.qty.toFixed(2)}</ThemedText>
                                            </ThemedView>
                                        ))}

                                        {/* Chamberwise Dip List After */}
                                        <ThemedText style={styles.subtitle}>Chamberwise Dip List After</ThemedText>
                                        {addition.sheetId.chamberwiseDipListAfter.map((chamber, index) => (
                                            <ThemedView key={index}>
                                                <ThemedText>{chamber.chamberId}</ThemedText>
                                                <ThemedText>Level Height: {chamber.levelHeight}</ThemedText>
                                                <ThemedText>Quantity: {chamber.qty.toFixed(2)}</ThemedText>
                                            </ThemedView>
                                        ))}

                                        {/* Chamberwise Seal List */}
                                        <ThemedText style={styles.subtitle}>Chamberwise Seal List</ThemedText>
                                        {addition.sheetId.chamberwiseSealList.map((seal, index) => (
                                            <ThemedView key={index}>
                                                <ThemedText>{seal.chamberId}</ThemedText>
                                                <ThemedText>Seal ID: {seal.sealId}</ThemedText>
                                                <ThemedText>Seal Photo:</ThemedText>
                                                <Image source={{ uri: seal.sealPhoto }} style={styles.sealImage} />
                                            </ThemedView>
                                        ))}
                                    </ThemedView>
                                ))
                            }

                            {/* Settlement Information */}
                            {tripSheet.settelment?.settled == true && (
                                <>
                                    <ThemedText style={styles.subtitle}>Settlement Information</ThemedText>
                                    <ThemedText>Settlement Date: {new Date(tripSheet.settelment.dateTime).toLocaleString()}</ThemedText>
                                    <ThemedText>Qty on return: {tripSheet.settelment.details.totalQty}</ThemedText>
                                    <ThemedText>Pump Reading on return: {tripSheet.settelment.details.pumpReading}</ThemedText>
                                </>
                            )}
                        </ThemedView>
                    )}
                </ScrollView>
            )}
        </ThemedView>
    );
};

// Styles
const styles = StyleSheet.create({
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
    },
    sealImage: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
    },
});

export default Tripsheet;
