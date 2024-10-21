import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text } from 'react-native';
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

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const userDataString = await AsyncStorage.getItem('userData');
            let userData = userDataString && JSON.parse(userDataString);
            const response = await axios.get<ServerResponse>(`https://bowser-backend-2cdr.onrender.com/fuelingOrders/${userData?.['User Id']}`);
            setNotificationsData(response.data.orders);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setError('Failed to load notifications. Please try again later.');
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
        <ScrollView style={styles.container}>
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
                            orderId={data._id.toString()} // Convert ObjectId to string
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
