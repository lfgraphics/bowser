import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text, RefreshControl } from 'react-native';
import FuelNotification from '@/components/FuelNotification';
import { FuelingOrderData, UserData } from '@/src/types/models';
import axios from 'axios'; // Make sure axios is installed and imported
import AsyncStorage from '@react-native-async-storage/async-storage';
import mongoose from 'mongoose';

interface ServerResponse {
    orders: FuelingOrderData[];
    totalPages: number;
    currentPage: number;
}

export default function NotificationsScreen() {
    const [notificationsData, setNotificationsData] = useState<FuelingOrderData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications().then(() => setRefreshing(false));
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            setError(null);
            const userDataString = await AsyncStorage.getItem('userData');
            let userData = userDataString && JSON.parse(userDataString);
            if (!userData || !userData['User Id']) {
                throw new Error('User data not found. Please log in again.');
            }
            const API_BASE_URL = await AsyncStorage.getItem('API_BASE_URL') || 'https://bowser-backend-2cdr.onrender.com';
            const response = await axios.get<ServerResponse>(`http://192.168.88.55:5000/fuelingOrders/${userData['User Id']}`);
            setNotificationsData(response.data.orders);
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text>{error}</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {notificationsData.length > 0 ? (
                notificationsData.map((data) => (
                    <View style={{ marginBottom: 10 }} key={data._id}>
                        <FuelNotification
                            vehicleNumber={data.vehicleNumber}
                            driverId={data.driverId}
                            driverMobile={data.driverMobile || ''}
                            driverName={data.driverName}
                            quantityType={data.quantityType}
                            quantity={data.fuelQuantity.toString()}
                            bowserDriver={data.bowserDriver}
                            orderId={data._id.toString()}
                            allocationAdmin={data.allocationAdmin || {
                                _id: '',
                                userName: '',
                                userId: ''
                            }}
                        />
                    </View>
                ))
            ) : (
                <Text style={styles.noNotifications}>No notifications available</Text>
            )}
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        paddingTop: 40,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noNotifications: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#666',
    },
});
