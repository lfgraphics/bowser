import React from 'react';
import { ObjectId } from 'mongodb';
import { View, StyleSheet, ScrollView } from 'react-native';
import FuelNotification from '@/components/FuelNotification';
import { PrePopulatedFuelingData } from '@/src/types/models';

const notificationsData: PrePopulatedFuelingData[] = [
    { vehicleNumber: 'ABC123', driverId: '123', driverMobile: '1234567890', driverName: 'John Doe', quantityType: 'Full' as const, fuelQuantity: '0', bowserDriver: { _id: new ObjectId('666666666666666666666666'), userName: 'John Doe', userId: '123' } },
    { vehicleNumber: 'DEF456', driverId: '456', driverMobile: '9876543210', driverName: 'Jane Doe', quantityType: 'Part' as const, fuelQuantity: '20', bowserDriver: { _id: new ObjectId('666666666666666666666666'), userName: 'John Doe', userId: '123' } },
    { vehicleNumber: 'GHI789', driverId: '789', driverMobile: '1234567890', driverName: 'John Doe', quantityType: 'Full' as const, fuelQuantity: '0', bowserDriver: { _id: new ObjectId('666666666666666666666666'), userName: 'John Doe', userId: '123' } },
    { vehicleNumber: 'JKL012', driverId: '012', driverMobile: '9876543210', driverName: 'Jane Doe', quantityType: 'Part' as const, fuelQuantity: '20', bowserDriver: { _id: new ObjectId('666666666666666666666666'), userName: 'John Doe', userId: '123' } },
];

export default function NotificationsScreen() {
    return (
        <ScrollView style={styles.container}>
            {notificationsData.map((data, index) => (
                <View style={{ marginBottom: 10 }} key={index}>
                    <FuelNotification {...data} />
                </View>
            ))}
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 10,
        paddingBottom: 25,
        marginTop: 40
    },
});