import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, ActivityIndicator, TextInput } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { AppUpdates, DriverData, UserData } from '../src/types/models';
import { logoutUser } from "@/src/utils/authUtils";
import { baseUrl, getAppUpdate } from "@/src/utils/helpers";
import DriversRequestStatus from "./DriversRequestStatus";
import OdometerModal from "./OdometerModal";

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
    const [vehicleNumbers, setVehicleNumbers] = useState<string[]>([]);
    const [appurl, setAppUrl] = useState<string | null>(null);
    const [odometerModalVisible, setOdometerModalVisible] = useState(false);
    const [vehicleSelectionModalVisible, setVehicleSelectionModalVisible] = useState(false);
    const [odometerValue, setOdometerValue] = useState('');
    const [selectedFunction, setSelectedFunction] = useState<(value: string) => void>(() => () => { });
    const [processFunction, setProcessFunction] = useState<((vehicleNumber: string) => void) | null>(() => null);
    const { colors } = useTheme();

    const openModalWithFunction = (callback: (value: string) => Promise<void> | void) => {
        setSelectedFunction(() => (value: string) => {
            Promise.resolve(callback(value)).catch((error) => {
                console.error("Error in callback function:", error);
            });
        });
        setVehicleSelectionModalVisible(true);
    };

    const openProcessModal = async (processFn: (vehicleNumber: string) => void) => {
        // Step 1: Fetch vehicle numbers
        await getVehicleNumber();

        // Step 2: Set the process function dynamically
        setProcessFunction(() => processFn);

        // Step 3: Open the modal for vehicle selection
        setOdometerModalVisible(true);
    };

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
    }, []);

    async function requestedYesterday() {
        let lastRequestTime = await AsyncStorage.getItem('requestTime');
        let currentTime = Date.now();

        if (lastRequestTime) {
            let lastRequestTimeInMs = parseInt(lastRequestTime, 10); // Convert stored string to number

            let hoursDifference = (currentTime - lastRequestTimeInMs) / (1000 * 60); // Convert ms to minutes

            if (hoursDifference < 20) { // 20 minutes
                return true;
            }
        }
        return false;
    }

    const handleRequestFuel = async () => {
        await getVehicleNumber();

        setVehicleSelectionModalVisible(true);

        setProcessFunction(() => async (vehicleNumber: string) => {
            openModalWithFunction(async (odometer: string) => {
                await requestFuel({ vehicleNumber, odometer });
            });
        });
    };

    const handleLoadingReport = async () => {
        await getVehicleNumber();

        setVehicleSelectionModalVisible(true);

        setProcessFunction(() => async (vehicleNumber: string) => {
            openModalWithFunction(async (odometer: string) => {
                await requestFuel({ vehicleNumber, odometer });
            });
        });
    };

    const handleReporting = async () => {
        await getVehicleNumber();

        setVehicleSelectionModalVisible(true);

        setProcessFunction(() => async (vehicleNumber: string) => {
            openModalWithFunction(async (odometer: string) => {
                await requestFuel({ vehicleNumber, odometer });
            });
        });
    };

    const handleUnloadingReport = async () => {
        await getVehicleNumber();

        setVehicleSelectionModalVisible(true);

        setProcessFunction(() => async (vehicleNumber: string) => {
            openModalWithFunction(async (odometer: string) => {
                await requestFuel({ vehicleNumber, odometer });
            });
        });
    };

    const requestFuel = async ({ vehicleNumber, odometer }: {
        vehicleNumber: string;
        odometer: string;
    }) => {
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
                            vehicleNumber,
                            odometer,
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
                            const errorData = await response.json();
                            throw new Error(`${errorData.message}`);
                        }
                        const data = await response.json();
                        await AsyncStorage.setItem('requestId', data.requestId);
                        setRequestId(data.requestId);
                        console.log('request Id:', data.requestId);
                        await AsyncStorage.setItem('sentLocation', gpsLocation);
                        Alert.alert(
                            'Sucess',
                            'सफलतापूर्वक फ्यूल रिक्वेस्ट भेज दी गई है। ईंधन कंट्रोल डिपार्टमेंट से कॉल आने का इन्तेज़ार करें।'
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
                        err instanceof Error ? err.message : String(err)
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

    const handleLoadingSubmit = async ({ vehicleNumber, odometer }: {
        vehicleNumber: string;
        odometer: string;
    }) => {
        try {
            if (userData && isDriverData(userData)) {
                const body = JSON.stringify({
                    vehicleNumber,
                    odometer,
                    driverId: userData.Id,
                    driverName: userData.Name,
                    driverMobile: userData['Phone Number'],
                });
                const response = await fetch(`${baseUrl}/fuel-request/loading-report`, {
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
                console.log('Loading report response:', data);
                Alert.alert('सफलता', 'लोडिंग रिपोर्ट सफलतापूर्वक भेज दी गई है।');
            } else {
                Alert.alert('एरर', 'आप को दुबारा लॉग इन करने की आवश्यकता है।');
                logoutUser();
            }
        } catch (error) {
            console.error('Error in handleLoadingSubmit:', error);
            Alert.alert('एरर', 'लोडिंग रिपोर्ट नहीं भेज पाए, कृपया दोबारा कोशिश करें।');
        }
    }

    const getVehicleNumber = async () => {
        if (userData && isDriverData(userData)) {
            setLoading(true);
            try {
                const response = await fetch(`${baseUrl}/fuel-request/driver?driverId=${userData.Id}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch vehicle numbers. Status: ${response.status}`);
                }

                const vehicleNumbersData = await response.json();
                if (vehicleNumbersData.length === 0) {
                    Alert.alert('एरर', 'कोई गाड़ी नंबर नहीं मिला। कृपया दोबारा कोशिश करें।');
                    return;
                }

                // Update the vehicle numbers state
                setVehicleNumbers(vehicleNumbersData);
            } catch (error) {
                console.error('Error fetching vehicle numbers:', error);
                Alert.alert('एरर', 'गाड़ी नंबर नहीं मिल पाया। कृपया दोबारा कोशिश करें।');
            } finally {
                setLoading(false);
            }
        } else {
            Alert.alert('एरर', 'आप को दुबारा लॉग इन करने की आवश्यकता है।');
            logoutUser();
        }
    };

    if (!permissionsGranted || !isGPSEnabled) {
        return (
            <View style={[styles.container, { backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' }]}>
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
            <ScrollView
                style={[{marginTop:5 ,backgroundColor: colors.background }]}
                contentContainerStyle={{ alignItems: "center", justifyContent: "center" }}
            >
                <TouchableOpacity
                    style={styles.profileButton}
                    onPress={() => setProfileModalVisible(true)}
                >
                    <Ionicons name="person-circle-outline" size={32} color="#0a7ea4" />
                </TouchableOpacity>

                <View style={{ flexDirection: "column", gap: 8, alignItems: "center", marginTop: 100, marginBottom: 20 }}>
                    <TouchableOpacity
                        style={[styles.requestButton, { display: 'none' }]}
                        onPress={handleLoadingReport}
                    >
                        <Text style={styles.requestButtonText}>लोड हो गई</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.requestButton, { display: 'none' }]}
                        onPress={handleReporting}
                    >
                        <Text style={styles.requestButtonText}>पहुँच गई</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.requestButton, { display: 'none' }]}
                        onPress={handleUnloadingReport}
                    >
                        <Text style={styles.requestButtonText}>ख़ाली हो गई</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.requestButton}
                        onPress={handleRequestFuel}
                    >
                        <Text style={styles.requestButtonText}>ईंधन अनुरोध</Text>
                    </TouchableOpacity>
                </View>

                {requestId && <DriversRequestStatus key={requestId} requestId={requestId} />}

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
                                <ScrollView contentContainerStyle={{ alignItems: "flex-start", justifyContent: "center" }} style={styles.modalBody}>
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

                <OdometerModal
                    visible={odometerModalVisible}
                    onClose={() => setOdometerModalVisible(false)}
                    onSubmit={selectedFunction}
                    placeholder="ओडोमीटर (किलोमीटर) रीडिंग दर्ज करें"
                    value={odometerValue}
                    setValue={setOdometerValue}
                    title="ओडोमीटर (किलोमीटर) रीडिंग"
                    submitButtonText="भेजें"
                />

                <Modal
                    visible={vehicleSelectionModalVisible}
                    onRequestClose={() => setVehicleSelectionModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>गाड़ी नंबर चुनें</Text>
                        {vehicleNumbers.map((vehicleNumber) => (
                            <TouchableOpacity
                                key={vehicleNumber}
                                style={styles.button}
                                onPress={() => {
                                    if (processFunction) {
                                        processFunction(vehicleNumber.split(' - ')[0]);
                                        setVehicleSelectionModalVisible(false);
                                        setOdometerModalVisible(true);
                                    } else {
                                        console.error("processFunction is not set");
                                    }
                                }}
                            >
                                <Text style={styles.buttonText}>{vehicleNumber}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Modal>

            </ScrollView >
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
        transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
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
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        marginVertical: 10,
        borderRadius: 5,
        width: '90%',
        alignSelf: 'center',
    },
}
);
