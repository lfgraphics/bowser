import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, ActivityIndicator } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { AppUpdates, DriverData, UserData } from '../src/types/models';
import { logoutUser } from "@/src/utils/authUtils";
import { baseUrl, getAppUpdate } from "@/src/utils/helpers";
import DriversRequestStatus from "./DriversRequestStatus";

interface VehicleDriverHomeProps {
    userData: DriverData | UserData | null;
}

const isDriverData = (data: DriverData | UserData): data is DriverData => {
    return (data as DriverData).VehicleNo !== undefined;
};

const VehicleDriverHome: React.FC<VehicleDriverHomeProps> = ({ userData }) => {
    const [requestId, setRequestId] = useState<string>()
    const [isProfileModalVisible, setProfileModalVisible] = useState(false);
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [isGPSEnabled, setIsGPSEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [appurl, setAppUrl] = useState<string | null>(null);
    const { colors } = useTheme();

    useEffect(() => {
        const updateRequestStatus = async () => {
            const requestId = await AsyncStorage.getItem('requestId');
            requestId && setRequestId(requestId);
        }
        updateRequestStatus();
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
        // showUpdateLink();
    }, []);

    // let showUpdateLink = async () => {
    //     let appPushsOnDb: AppUpdates[] = await getAppUpdate()
    //     let latesApp = appPushsOnDb[0]
    //     if (latesApp.buildVersion > appVersion) {
    //         setAppUrl(latesApp.url)
    //     }
    // }

    async function requestedYesterday() {
        let lastRequestTime = await AsyncStorage.getItem('requestTime');
        let currentTime = Date.now();

        if (lastRequestTime) {
            let lastRequestTimeInMs = parseInt(lastRequestTime, 10); // Convert stored string to number

            let hoursDifference = (currentTime - lastRequestTimeInMs) / (1000 * 60 * 60); // Convert ms to hours

            if (hoursDifference < 3) {
                return true;
            }
        }
        return false;
    }

    const requestFuel = async () => {
        if (userData) {

            if (await requestedYesterday()) {
                Alert.alert(
                    'तेल नहीं ले सकते',
                    'आप का अनुरोध पहले ही भेजा जा चुका है। कृपया इंतज़ार करें।'
                );
                return;
            }

            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('परमीशन दें', 'रिक्वेस्ट के लिये लोकेशन की परमिशन ज़रूरी है।');
                return;
            }

            try {
                setLoading(true);
                let location = await Location.getCurrentPositionAsync({});
                const { latitude, longitude } = location.coords;
                const gpsLocation = `${latitude},${longitude}`;
                try {
                    if (userData && isDriverData(userData)) {
                        const body = JSON.stringify({
                            vehicleNumber: userData.VehicleNo,
                            driverId: userData.Id,
                            driverName: userData.Name,
                            driverMobile: userData['Phone Number'],
                            location: gpsLocation,
                        });
                        const response = await fetch(`${baseUrl}/fuel-request`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body,
                        });
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const data = await response.json();
                        await AsyncStorage.setItem('requestId', data.requestId);
                        setRequestId(data.requestId);
                        console.log('request Id:', data.requestId);
                        /*
                        - we can use the request id to update the vehicle drivers location in the request body so that the bowser driver will get updated location
                        - we need to plan interation of proper location sharing in the UI of both
                        */
                        await AsyncStorage.setItem('sentLocation', gpsLocation);
                        Alert.alert(
                            'Sucess',
                            'सफलतापूर्वक फ्यूल रिक्वेस्ट भेज दी गई है। डीज़ल कंट्रोल डिपार्टमेंट से कॉल आने का इन्तेज़ार करें।'
                        );
                        await AsyncStorage.setItem('requestTime', Date.now().toString());
                    } else {
                        Alert.alert(
                            'एरर',
                            'आप को दुबारा लॉग इन करने की आवश्यकता है।'
                        );
                        logoutUser();
                    }
                } catch (err) {
                    console.error('Could not send the location:', err);
                    Alert.alert(
                        'एरर',
                        'फ्यूल रिक्वेस्ट नहीं भेज पाए, कृपया दोबारा कोशिश करें।'
                    );
                }
            } catch (error) {
                console.error('Error getting location:', error);
                Alert.alert('एरर', 'लोकेशन नहीं मिली| कृपया दोबारा कोशिश करें।');
            } finally {
                setLoading(false);
            }
        }
    };

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
        <>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                    style={styles.profileButton}
                    onPress={() => setProfileModalVisible(true)}
                >
                    <Ionicons name="person-circle-outline" size={32} color="#0a7ea4" />
                </TouchableOpacity>

                <View style={{ flexDirection: "column", gap: 8, alignItems: "center", marginBottom: 20 }}>
                    <View style={{ flexDirection: "column", gap: 8, alignItems: "center", display: "none" }}>
                        <TouchableOpacity disabled style={[styles.requestButton, styles.disabled]} onPress={requestFuel}>
                            <Text style={styles.requestButtonText}>लोड हो गई</Text>
                        </TouchableOpacity>
                        <TouchableOpacity disabled style={[styles.requestButton, styles.disabled]} onPress={requestFuel}>
                            <Text style={styles.requestButtonText}>रिपोर्ट हो गई</Text>
                        </TouchableOpacity>
                        <TouchableOpacity disabled style={[styles.requestButton, styles.disabled]} onPress={requestFuel}>
                            <Text style={styles.requestButtonText}>ख़ाली हो गई</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.requestButton} onPress={requestFuel}>
                        <Text style={styles.requestButtonText}>डीज़ल अनुरोध</Text>
                    </TouchableOpacity>
                    {/* {appurl &&
                        <Link style={[styles.button]} href={appurl as any}><Text style={{ color: colors.text }}>ऐप अपडेट करें</Text></Link>
                    } */}
                </View>
                {requestId && <DriversRequestStatus requestId={requestId} />}

                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={isProfileModalVisible}
                    onRequestClose={() => setProfileModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>प्रोफ़ाइल</Text>
                            </View>
                            {userData && isDriverData(userData) ? (
                                <ScrollView style={styles.modalBody}>
                                    <Text style={[styles.profileText, { color: colors.text }]}>नाम: {userData?.Name}</Text>
                                    <Text style={[styles.profileText, { color: colors.text }]}>अई-डी: {userData?.Id}</Text>
                                    <Text style={[styles.profileText, { color: colors.text }]}>फ़ोन नम्बर: {userData && userData['Phone Number']}</Text>
                                    <Text style={[styles.profileText, { color: colors.text }]}>गाड़ी नम्बर: {userData?.VehicleNo}</Text>
                                </ScrollView>
                            ) : (
                                <Text style={[styles.profileText, { color: colors.text }]}>नाम: {userData?.name}</Text>
                            )}
                            <View style={styles.modalFooter}>
                                {isProfileModalVisible &&
                                    <TouchableOpacity style={styles.logoutButton} onPress={logoutUser}>
                                        <Ionicons name="log-out-outline" size={24} color="white" />
                                        <Text style={styles.logoutButtonText}>लॉग आउट करें</Text>
                                    </TouchableOpacity>
                                }
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setProfileModalVisible(false)}
                                >
                                    <Text style={styles.closeButtonText}>बंद करें</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal >
            </View >
            {loading && <View style={styles.loaderBg}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>}
        </>
    );
}

export default VehicleDriverHome;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loaderBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
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
        marginTop: 30,
        width: 180,
        transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }],
        backgroundColor: '#0a7ea4',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    disabled: {
        backgroundColor: 'gray',
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