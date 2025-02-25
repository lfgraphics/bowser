import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, RefreshControl, View } from 'react-native';
import FuelNotification from '@/components/FuelNotification';
import { FuelingOrderData } from '@/src/types/models';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { baseUrl } from '@/src/utils/helpers';

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
    const { colors } = useTheme();

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
            if (!userData || !userData['Phone Number']) {
                throw new Error('User data not found. Please log in again.');
            }
            const url = `${baseUrl}/fuelingOrders/${userData['Phone Number']}`;
            const response = await axios.get<ServerResponse>(url);
            setNotificationsData(response.data.orders);
            console.log(response.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [])
    );

    if (loading) {
        return (
            <ThemedView style={styles.centerContainer}>
                <ActivityIndicator size="large" />
            </ThemedView>
        );
    }

    if (error) {
        return (
            <ThemedView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
                <ThemedText style={{ color: colors.text }}>{error}</ThemedText>
            </ThemedView>
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
                            createdAt={data.createdAt!}
                            category={data.category}
                            party={data.party}
                            vehicleNumber={data.vehicleNumber}
                            driverId={data.driverId}
                            driverMobile={data.driverMobile || ''}
                            driverName={data.driverName}
                            quantityType={data.quantityType}
                            quantity={data.fuelQuantity.toString()}
                            bowser={data.bowser}
                            orderId={data._id.toString()}
                            allocationAdmin={data.allocationAdmin!}
                            request={data.request!}
                        />
                    </View>
                ))
            ) : (
                <ThemedText style={styles.noNotifications}>No Pending Orders Available</ThemedText>
            )}
            <ThemedView style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        paddingTop: 40
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
