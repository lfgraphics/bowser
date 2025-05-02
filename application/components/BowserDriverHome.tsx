import 'react-native-get-random-values';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Modal, Alert, ScrollView, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { checkUserLoggedIn } from '../src/utils/authUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { AppUpdates, FormData, UserData } from '../src/types/models';
import FuelingRecords from '@/components/FuelingRecords';
import { useTheme } from '@react-navigation/native';
import { getAppUpdate } from '@/src/utils/helpers'
import Accordion from './Accordian';
import { ThemedText } from './ThemedText';

export default function BowserDriverHome() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isProfileModalVisible, setProfileModalVisible] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [isGPSEnabled, setIsGPSEnabled] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [offlineDataLength, setOfflineDataLength] = useState(0);
    const [offlineData, setOfflineData] = useState<FormData[]>([]);
    const [isOfflineDataModalVisible, setOfflineDataModalVisible] = useState(false);
    const [isOfflineDataLoading, setIsOfflineDataLoading] = useState(false);
    const { colors } = useTheme();
    const appVersion = 63;
    const [appurl, setAppUrl] = useState<string | null>(null);

    let showUpdateLink = async () => {
        let appPushsOnDb: AppUpdates[] = await getAppUpdate()
        let latesApp = appPushsOnDb[0]
        if (latesApp.buildVersion > appVersion) {
            setAppUrl(latesApp.url)
        }
    }

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected ?? false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const initializeApp = async () => {
            await checkUserLoggedIn()
            showUpdateLink()
            try {
                await syncOfflineData();

                const userDataString = await AsyncStorage.getItem('userData');
                if (userDataString) {
                    setUserData(JSON.parse(userDataString));
                }
                await getOfflineDataLength()
                await requestPermissions();
            } catch (error) {
                console.error('Error initializing app:', error);
                setError('An error occurred while initializing the app. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        initializeApp();
    }, []);

    const syncOfflineData = async () => {
        if (isOnline) {
            try {
                const offlineData = await AsyncStorage.getItem('offlineFuelingData');
                if (offlineData) {
                    const offlineArray = JSON.parse(offlineData);
                    if (offlineArray.length > 0) {
                        const userConfirmed = await new Promise((resolve) => {
                            Alert.alert(
                                "Sync Offline Data",
                                `You have ${offlineArray.length} offline entries. Do you want to sync them now?`,
                                [
                                    { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
                                    { text: "Sync", onPress: () => resolve(true) }
                                ],
                                { cancelable: false }
                            );
                        });

                        if (userConfirmed) {
                            for (const formData of offlineArray) {
                                try {
                                    const response = await fetch(`https://bowser-backend-2cdr.onrender.com/addFuelingTransaction`, { //https://bowser-backend-2cdr.onrender.com
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify(formData),
                                    });
                                    if (!response.ok) {
                                        throw new Error(`HTTP error! status: ${response.status}`);
                                    }
                                } catch (err) {
                                    console.error('Error syncing offline data:', err);
                                }
                            }
                            await AsyncStorage.removeItem('offlineFuelingData');
                            Alert.alert(
                                "Success",
                                "Offline data synced successfully.",
                                [{ text: "OK" }],
                                { cancelable: false }
                            );
                        }
                    }
                }
            } catch (error) {
                console.error('Error during offline data sync:', error);
                Alert.alert(
                    "Error",
                    `Failed to submit offline data.\n${error}`,
                    [{ text: "OK" }],
                    { cancelable: false }
                );
            }
        }
    };

    useEffect(() => {
        if (permissionsGranted) {
            checkGPSStatus();
        }
    }, [permissionsGranted]);

    const requestPermissions = async () => {
        try {
            const [locationPermission] = await Promise.all([
                Location.requestForegroundPermissionsAsync(),
            ]);

            if (locationPermission.status === 'granted') {
                setPermissionsGranted(true);
                await checkGPSStatus();
            } else {
                Alert.alert(
                    'Permissions Required',
                    'This app requires location and camera permissions to function properly.',
                    [{ text: 'OK' }]
                );
            }

            // const { status: existingStatus } = await Notifications.getPermissionsAsync();
            // let finalStatus = existingStatus;

            // if (existingStatus !== 'granted') {
            //   const { status } = await Notifications.requestPermissionsAsync();
            //   finalStatus = status;
            // }

            // if (finalStatus !== 'granted') {
            //   Alert.alert('Permissions Required', 'This app requires push notification permissions to function properly.', [{ text: 'OK' }]);
            //   return;
            // }

            // Update permissions flag in AsyncStorage
            await AsyncStorage.setItem('permissionsGranted', 'true');
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

    const handleLogout = async (isAutomatic = false) => {
        try {
            if (!isAutomatic) {
                // Ask for user confirmation
                const userConfirmed = await new Promise((resolve) => {
                    Alert.alert(
                        "Logout Confirmation",
                        "Are you sure you want to logout?",
                        [
                            { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
                            { text: "Logout", onPress: () => resolve(true) }
                        ],
                        { cancelable: false }
                    );
                });

                if (!userConfirmed) return;
            }

            // Check for offline data
            const offlineData = await AsyncStorage.getItem('offlineFuelingData');
            if (offlineData) {
                const offlineArray = JSON.parse(offlineData);
                if (offlineArray.length > 0) {
                    const shouldSubmit = await new Promise((resolve) => {
                        Alert.alert(
                            "Offline Data",
                            `You have ${offlineArray.length} offline entries. Do you want to submit them before logging out?`,
                            [
                                { text: "No", onPress: () => resolve(false) },
                                { text: "Yes", onPress: () => resolve(true) }
                            ],
                            { cancelable: false }
                        );
                    });

                    if (shouldSubmit) {
                        await syncOfflineData();
                        // Proceed with logout after syncing
                        await AsyncStorage.removeItem('userToken');
                        await AsyncStorage.removeItem('userData');
                        await AsyncStorage.removeItem('pushToken');
                        // unregisterIndieDevice(userData?.phoneNumber, 25239, 'FWwj7ZcRXQi7FsC4ZHQlsi');
                        router.replace('/auth' as any);
                    } else {
                        // User chose not to submit offline data, cancel logout
                        return;
                    }
                } else {
                    // No offline data, proceed with normal logout
                    await AsyncStorage.removeItem('userToken');
                    await AsyncStorage.removeItem('userData');
                    await AsyncStorage.removeItem('pushToken');
                    router.replace('/auth' as any);
                }
            } else {
                // No offline data, proceed with normal logout
                await AsyncStorage.removeItem('userToken');
                await AsyncStorage.removeItem('userData');
                await AsyncStorage.removeItem('pushToken');
                router.replace('/auth' as any);
            }
        } catch (error) {
            Alert.alert('Logout Error', 'An error occurred during logout. Please try again.');
        }
    };

    const getOfflineDataLength = async () => {
        try {
            setIsOfflineDataLoading(true);
            const offlineDataString = await AsyncStorage.getItem('offlineFuelingData');
            if (offlineDataString) {
                const offlineArray: FormData[] = JSON.parse(offlineDataString);
                setOfflineDataLength(offlineArray.length);
                setOfflineData(offlineArray);
            }
        } catch (error) {
        } finally {
            setIsOfflineDataLoading(false);
        }
    };

    const handleSubmitOfflineData = async (item: FormData, index: number) => {
        if (isOnline) {
            try {
                const response = await fetch(`https://bowser-backend-2cdr.onrender.com/addFuelingTransaction`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(item),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                // Remove the submitted item from offlineData
                const updatedOfflineData = offlineData.filter((_, i) => i !== index);
                setOfflineData(updatedOfflineData);
                await AsyncStorage.setItem('offlineFuelingData', JSON.stringify(updatedOfflineData));
                setOfflineDataLength(updatedOfflineData.length);
                Alert.alert("Success", "Data submitted successfully.");
            } catch (error) {
                Alert.alert("Error", `Failed to submit data. ${error}`);
            }
        } else {
            Alert.alert("Error", "No internet connection. Please try again when online.");
        }
    };

    const renderUserData = () => {
        if (!userData) return null;

        return (
            <View style={[styles.modalBody, { backgroundColor: colors.card }]}>
                {Object.entries(userData)
                    .map(([key, value]) => (
                        <View key={key} style={styles.dataRow}>
                            <Text style={[styles.dataKey, { color: colors.text }]}>{key.charAt(0).toUpperCase() + key.slice(1)}: </Text>
                            <Text style={[styles.dataValue, { color: colors.text }]}>{String(value)}</Text>
                        </View>
                    ))}
            </View>
        );
    };

    const renderOfflineData = () => {
        if (isOfflineDataLoading) {
            return <ActivityIndicator size="large" color="#0000ff" />;
        }

        return (
            <ScrollView style={styles.modalScrollView}>
                {offlineData.map((item, index) => (
                    <Accordion
                        key={index}
                        title={`Data ${index + 1} captured at ${item.fuelingDateTime}`}
                        content={
                            <View>
                                {renderAccordionContent(item)}
                                <TouchableOpacity
                                    style={styles.submitButton}
                                    onPress={() => handleSubmitOfflineData(item, index)}
                                >
                                    <Text style={styles.submitButtonText}>सबमिट करें</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                ))}
            </ScrollView>
        );
    };

    const renderAccordionContent = (item: FormData) => (
        <View style={[styles.accordionContent, { backgroundColor: colors.card }]}>
            {Object.entries(item).map(([key, value]) => (
                <View key={key} style={styles.dataRow}>
                    <Text style={styles.dataKey}>{formatKey(key)}:</Text>
                    {renderValue(key, value)}
                </View>
            ))}
        </View>
    );

    const formatKey = (key: string) => {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    const renderValue = (key: string, value: any) => {
        if (key === 'vehicleNumberPlateImage' || key === 'fuelMeterImage' || key === 'slipImage') {
            return value ? (
                <Image source={{ uri: `${value}` }} style={styles.dataImage} />
            ) : (
                <Text style={styles.dataValue}>कोई फ़ोटो नहीं</Text>
            );
        } else if (key === 'bowserDriver') {
            if (Array.isArray(value)) {
                return (
                    <View style={[{ backgroundColor: colors.card }]}>
                        {value.map((driver: any, index: number) => (
                            <View key={index} style={styles.bowserDriverItem}>
                                <Text style={styles.dataValue}>ड्राईवर: {index + 1}:</Text>
                                <Text style={styles.dataValue}>आईडी: {driver._id}</Text>
                                <Text style={styles.dataValue}>नाम: {driver.userName}</Text>
                                <Text style={styles.dataValue}>यूजर आईडी: {driver.userId}</Text>
                            </View>
                        ))}
                    </View>
                );
            } else if (typeof value === 'object' && value !== null) {
                // Handle case where bowserDriver is a single object
                return (
                    <View style={styles.bowserDriverItem}>
                        <Text style={styles.dataValue}>ड्राईवर:</Text>
                        <Text style={styles.dataValue}>आईडी: {value._id}</Text>
                        <Text style={styles.dataValue}>नाम: {value.userName}</Text>
                        <Text style={styles.dataValue}>यूजर आईडी: {value.userId}</Text>
                    </View>
                );
            } else {
                return <Text style={styles.dataValue}>बौज़र ड्राईवर का डाटा नहीं प्राप्त हुवा</Text>;
            }
        } else if (typeof value === 'object' && value !== null) {
            return <Text style={styles.dataValue}>{JSON.stringify(value)}</Text>;
        } else {
            return <Text style={styles.dataValue}>{String(value ?? 'N/A')}</Text>;
        }
    };

    if (isLoading) {
        return <View style={styles.container}>
            <ActivityIndicator size="large" color="#0000ff" />
        </View>;
    }
    if (error) {
        return (
            <View style={[styles.container, styles.errorContainer]}>
                <Text style={styles.errorText}>{error}</Text>
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
            {
                isOnline && <FuelingRecords />
            }
            <Link style={styles.button} href={'/tripsheet'}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <ThemedText style={{ color: 'white' }}>
                        ट्रिप शीट डीटेल्स
                    </ThemedText>
                    <MaterialIcons name="table-chart" size={24} color="white" style={{ marginHorizontal: 10 }} />
                </View>
            </Link>
            <Link style={styles.button} href={'/fueling'}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white' }}>
                        गाड़ी को तेल दें
                    </Text>
                    <MaterialIcons name="local-gas-station" size={24} color="white" style={{ marginHorizontal: 10 }} />
                </View>
            </Link>
            <Link style={styles.button} href={'/notifications'}>
                {/* disabled */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white' }}>
                        ऑर्डर्स चेक करें
                    </Text>
                    <Ionicons name="notifications" size={20} color="white" style={{ marginHorizontal: 10 }} />
                </View>
            </Link>
            {/* {appurl &&
                <View style={styles.modalContainer}>
                    <Link style={styles.button} href={appurl as any}><Text style={{ color: colors.text }}>ऐप अपडेट करें</Text></Link>
                </View>
            } */}

            <Modal
                animationType="fade"
                transparent={true}
                visible={isProfileModalVisible}
                onRequestClose={() => setProfileModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>प्रोफाइल</Text>
                        </View>
                        <ScrollView style={[styles.modalScrollView, { backgroundColor: colors.card }]}>
                            {renderUserData()}
                            {offlineDataLength > 0 && (
                                <>
                                    <Text style={{ color: colors.text }}>{offlineDataLength ? offlineDataLength : "कोई भी ऑफलाइन डाटा नहीं"}</Text>
                                    <TouchableOpacity
                                        style={styles.offlineDataButton}
                                        onPress={() => setOfflineDataModalVisible(true)}
                                    >
                                        <Text style={styles.offlineDataButtonText}>
                                            ऑफलाइन डाटा देखें ({offlineDataLength})
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}
                            {appurl &&
                                <View style={styles.modalContainer}>
                                    <Link style={styles.button} href={appurl as any}><Text style={{ color: colors.text }}>ऐप अपडेट करें</Text></Link>
                                </View>}
                        </ScrollView>
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.logoutButton} onPress={() => handleLogout(false)}>
                                <Ionicons name="log-out-outline" size={24} color="white" />
                                <Text style={styles.logoutButtonText}>लॉगआउट करें</Text>
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

            <Modal
                animationType="fade"
                transparent={true}
                visible={isOfflineDataModalVisible}
                onRequestClose={() => setOfflineDataModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>ऑफलाइन रिकॉर्ड</Text>
                        {renderOfflineData()}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setOfflineDataModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>बंद करें</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'dark',
        paddingHorizontal: 20,
    },
    button: {
        width: '70%',
        padding: 15,
        marginVertical: 5,
        backgroundColor: '#0a7ea4',
        borderRadius: 5,
        alignItems: 'center',
        textAlign: 'center',
        paddingHorizontal: 20,
        color: 'white'
    },
    disabledButton: {
        backgroundColor: 'gray',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
    },
    profileButton: {
        position: 'absolute',
        top: 40,
        right: 20,
    },
    accordionContent: {
        padding: 10,
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
        margin: 10,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalScrollView: {
        maxHeight: '70%',
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
    dataRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    dataKey: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    dataValue: {
        fontSize: 16,
        color: '#666',
    },
    offlineDataButton: {
        backgroundColor: '#0a7ea4',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        margin: 10,
    },
    offlineDataButtonText: {
        color: 'white',
        fontSize: 16,
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
    buttonText: {
        color: 'white',
    },
    dataImage: {
        width: 200,
        height: 200,
        resizeMode: 'contain',
        marginVertical: 5,
    },
    bowserDriverItem: {
        marginLeft: 10,
        marginBottom: 5,
        borderLeftWidth: 2,
        borderLeftColor: '#0a7ea4',
        paddingLeft: 5,
    },
    submitButton: {
        backgroundColor: '#0a7ea4',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        margin: 10,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
    },
});