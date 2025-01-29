import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { DriverData } from '../src/types/models';
import { logoutUser } from "@/src/utils/authUtils";
import { baseUrl } from "@/src/utils/helpers";

export default function VehicleDriverHome() {
    const [userData, setUserData] = useState<DriverData | null>(null);
    const [isProfileModalVisible, setProfileModalVisible] = useState(false);
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [isGPSEnabled, setIsGPSEnabled] = useState(false);
    const { colors } = useTheme();

    useEffect(() => {
        const fetchUserData = async () => {
            const userDataString = await AsyncStorage.getItem('userData');
            if (userDataString) {
                setUserData(JSON.parse(userDataString));
            }
        };
        fetchUserData();
    }, []);

    const requestPermissions = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                setPermissionsGranted(true);
                await checkGPSStatus();
            } else {
                Alert.alert(
                    'Permissions Required',
                    'This app requires location permissions to function properly.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error requesting permissions:', error);
            Alert.alert('Error', 'Failed to request permissions. Please try again.');
        }
    };
    const checkGPSStatus = async () => {
        try {
            const enabled = await Location.hasServicesEnabledAsync();
            setIsGPSEnabled(enabled);
            if (!enabled) {
                Alert.alert(
                    'GPS Required',
                    'Please enable GPS for this app to function properly.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Location.enableNetworkProviderAsync() }
                    ]
                );
            }
        } catch (error) {
            console.error('Error checking GPS status:', error);
            Alert.alert('Error', 'Failed to check GPS status. Please ensure GPS is enabled.');
        }
    };
    useEffect(() => {
        requestPermissions();
    }, []);

    const requestFuel = async () => {
        if (userData) {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to request fuel.');
                return;
            }

            try {
                let location = await Location.getCurrentPositionAsync({});
                const { latitude, longitude } = location.coords;
                const gpsLocation = `${latitude}, ${longitude}`;

                Alert.alert(
                    "Request Fuel",
                    `Requesting fuel for ${userData.Name} (ID: ${userData.Id}, Phone: ${userData['Phone Number']}, Vehicle: ${userData.VehicleNo}, Location: ${gpsLocation})`,
                    [{ text: "OK" }]
                );
                /*
                vehicleNumber: { type: String, required: false },
                driverId: { type: String, required: false },
                driverName: { type: String, required: true },
                driverMobile: { type: String },
                location: { type: String, required: true },
                */
                // this is the schema send the data to the backend at baseurl/fuel-request/ post request
                try {
                    const response = await fetch(`${baseUrl}/fuel-request`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            vehicleNumber: userData.VehicleNo,
                            driverId: userData.Id,
                            driverName: userData.Name,
                            driverMobile: userData['Phone Number'],
                            location: gpsLocation,
                        }),
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                } catch (err) {
                    console.error('Error syncing offline data:', err);
                }

            } catch (error) {
                console.error('Error getting location:', error);
                Alert.alert('Error', 'Failed to get current location. Please try again.');
            }
        }
    };

    if (!userData) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    if (!permissionsGranted || !isGPSEnabled) {
        return (
            <View style={[styles.container, { backgroundColor: colors.card }]}>
                <Text style={styles.errorText}>ऐप को संचलित रखने के लिए कृपया जी पी एस को ऑन करें और लोकेशन परमिशन दें|</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermissions}>
                    <Text style={styles.buttonText}>परमिशन दें</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={checkGPSStatus}>
                    <Text style={styles.buttonText}>जी पी एस चेक करें</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <TouchableOpacity
                style={styles.profileButton}
                onPress={() => setProfileModalVisible(true)}
            >
                <Ionicons name="person-circle-outline" size={32} color="#0a7ea4" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.requestButton} onPress={requestFuel}>
                <Text style={styles.requestButtonText}>Request Fuel</Text>
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isProfileModalVisible}
                onRequestClose={() => setProfileModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>प्रोफ़ाइल</Text>
                        </View>
                        <ScrollView style={styles.modalBody}>
                            <Text style={[styles.profileText, { color: colors.text }]}>नाम: {userData.Name}</Text>
                            <Text style={[styles.profileText, { color: colors.text }]}>अई-डी: {userData.Id}</Text>
                            <Text style={[styles.profileText, { color: colors.text }]}>फ़ोन नम्बर: {userData['Phone Number']}</Text>
                            <Text style={[styles.profileText, { color: colors.text }]}>गाड़ी नम्बर: {userData.VehicleNo}</Text>
                        </ScrollView>
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.logoutButton} onPress={logoutUser}>
                                <Ionicons name="log-out-outline" size={24} color="white" />
                                <Text style={styles.logoutButtonText}>लॉग आउट करें</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setProfileModalVisible(false)}
                            >
                                <Text style={styles.closeButtonText}>बंद करें</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    profileButton: {
        position: 'absolute',
        top: 40,
        right: 20,
    },
    profileContainer: {
        marginBottom: 20,
    },
    profileText: {
        fontSize: 18,
        marginBottom: 5,
    },
    requestButton: {
        transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }],
        backgroundColor: '#0a7ea4',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    requestButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loadingText: {
        fontSize: 18,
        color: '#666',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        width: '90%',
        maxHeight: '80%',
    },
    modalHeader: {
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        padding: 15,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalBody: {
        padding: 15,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        padding: 15,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0a7ea4',
        padding: 10,
        borderRadius: 5,
    },
    logoutButtonText: {
        color: 'white',
        marginLeft: 10,
    },
    closeButton: {
        padding: 10,
    },
    closeButtonText: {
        color: '#0a7ea4',
        fontSize: 16,
    },
    button: {
        width: '70%',
        padding: 15,
        marginVertical: 10,
        backgroundColor: '#0a7ea4',
        borderRadius: 5,
        alignItems: 'center',
        textAlign: 'center',
        paddingHorizontal: 20,
        color: 'white'
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginBottom: 10,
    },
});