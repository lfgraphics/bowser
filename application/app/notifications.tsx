import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, RefreshControl, View, Alert } from 'react-native';
import FuelNotification from '@/components/FuelNotification';
import { FuelingOrderData } from '@/src/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { baseUrl } from '@/src/utils/helpers';
import NetInfo from "@react-native-community/netinfo";
import { router } from 'expo-router';

export default function NotificationsScreen() {
    const [notificationsData, setNotificationsData] = useState<FuelingOrderData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [tripSheetId, setTripSheetId] = useState<number>(0);
    const { colors } = useTheme();

    useEffect(() => {
        fetchNotifications();
    }, []);
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setIsOnline(state.isConnected ?? false);
        });

        return () => unsubscribe();
    }, []);
    const getUserTripSheetId = async () => {
        try {
            const userDataString = await AsyncStorage.getItem("userData");
            const userData = userDataString ? JSON.parse(userDataString) : null;
            const tripSheetId = userData ? userData["Trip Sheet Id"] : null;
            setTripSheetId(Number(tripSheetId));
        } catch (error) {
            console.error("आप का डाटा नहीं मिल रहा कृपया दोबारा लॉग इन करें:", error);
        }
    };
    useEffect(() => {
        const checkTripValidity = async () => {
            await getUserTripSheetId();

            if (tripSheetId) {
                const isValidTrip = await validateTrip();
                if (!isValidTrip) {
                    Alert.alert("एरर", "आप की ट्रिप बंद कर दी गई है");
                    router.replace("/");
                }
            }
        };

        checkTripValidity();
    }, [tripSheetId]);

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
            console.log(url);
            const response = await fetch(url);
            const jsonResponse = await response.json();
            if (!response.ok) {
                throw new Error(jsonResponse.message || 'Failed to fetch data');
            }
            setNotificationsData(jsonResponse.orders);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const validateTrip = async (): Promise<boolean> => {
        if (isOnline && tripSheetId) {
            try {
                const endpoint = `/tripSheet/all?tripSheetId=${tripSheetId}&unsettled=true`;

                // Fetch data
                const response = await fetch(`${baseUrl}${endpoint}`);
                if (!response.ok) {
                    throw new Error("ट्रिप शीट नहीं मिली कृपया दोबारा लॉगइन करें");
                }

                const sheets = await response.json();

                return sheets.length > 0;
            } catch (error) {
                Alert.alert(
                    "आप की आई-डी पर कोई भी खुली हुई ट्रिप नहीं मिली:",
                );
                return false;
            }
        }
        if (!isOnline) return true;
        return false;
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
            {notificationsData?.length > 0 ? (
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
            {notificationsData?.length > 2 && <ThemedView style={{ height: 40 }} />}
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
