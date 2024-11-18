import mongoose from 'mongoose';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, ScrollView, View, ActivityIndicator, Button, Alert, Modal, FlatList } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { FormData } from '@/src/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

interface RouteParams {
    orderId: string;
    vehicleNumber: string;
    driverId: string;
    driverMobile: string;
    driverName: string;
    quantityType: "Part" | "Full";
    quantity: string;
    bowser: {
        regNo: string,
        driver: {
            name: string,
            id: string,
            phoneNo: string
        }
    }
    allocationAdmin: {
        name: string;
        id: string;
        allocationTime: string
    };
}

export default function NotificationFuelingScreen() {
    const route = useRoute();
    const {
        vehicleNumber = 'N/A',
        driverId = 'N/A',
        driverMobile = 'N/A',
        driverName = 'N/A',
        quantityType = 'N/A',
        quantity = 'N/A',
        orderId,
        bowser,
        allocationAdmin
    } = route.params as RouteParams;


    // declare state variables---->
    const colorScheme = useColorScheme();
    const navigation = useNavigation();
    const [vehicleNumberPlateImage, setVehicleNumberPlateImage] = useState<string | null>(null);
    const [fuelMeterImage, setFuelMeterImage] = useState<string | null>(null);
    const [slipImage, setSlipImage] = useState<string | null>(null);
    const [fuelQuantity, setFuelQuantity] = useState<string>(quantity.toString());
    const [driverMobileNo, setDriverMobileNo] = useState(driverMobile);
    const [gpsLocation, setGpsLocation] = useState('');
    const [fuelingDateTime, setFuelingDateTime] = useState('');
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [vehicleNumberPlateImageSize, setVehicleNumberPlateImageSize] = useState<string>('');
    const [fuelMeterImageSize, setFuelMeterImageSize] = useState<string>('');
    const [slipImageSize, setSlipImageSize] = useState<string>('');
    const [isOnline, setIsOnline] = useState(true);
    const { colors } = useTheme();

    // declare refs for input fields---->
    const vehicleNumberInputRef = React.useRef<TextInput>(null);
    const driverNameInputRef = React.useRef<TextInput>(null);
    const driverIdInputRef = React.useRef<TextInput>(null);
    const driverMobileInputRef = React.useRef<TextInput>(null);
    const fuelQuantityInputRef = React.useRef<TextInput>(null);
    const gpsLocationInputRef = React.useRef<TextInput>(null);
    const scrollViewRef = useRef<ScrollView>(null); // Ref for ScrollView

    // function declarations---->
    // startup function
    const location = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
            if (newStatus !== 'granted') {
                return;
            }
        }

        let location = await Location.getCurrentPositionAsync({});
        const coordinates = `Latitude ${location.coords.latitude}, Longitude ${location.coords.longitude}`;
        setGpsLocation(coordinates);
        return coordinates;
    }
    const fulingTime = () => {
        const currentDateTime = new Date().toLocaleString();
        setFuelingDateTime(currentDateTime);
        return currentDateTime;
    }
    const calculateBase64Size = (base64String: string): string => {
        const stringLength = base64String.length;
        const sizeInBytes = (stringLength * (3 / 4)) - (base64String.endsWith('==') ? 2 : base64String.endsWith('=') ? 1 : 0);
        const sizeInKB = sizeInBytes / 1024;
        const sizeInMB = sizeInKB / 1024;
        return `${sizeInKB.toFixed(2)} KB (${sizeInMB.toFixed(2)} MB)`;
    };
    const compressImage = async (uri: string): Promise<string> => {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 500 } }],
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );
        const base64Image = await imageToBase64(manipulatedImage.uri);
        return base64Image;
    };
    // form submit reset
    const submitDetails = async () => {
        setFormSubmitting(true);
        // if (!validateInputs()) {
        //     setFormSubmitting(false);
        //     return;
        // }

        let currentFuelingDateTime = fuelingDateTime;
        let currentGpsLocation = gpsLocation;
        const userDataString = await AsyncStorage.getItem('userData');
        const userData = userDataString ? JSON.parse(userDataString) : null;
        if (!userData) {
            Alert.alert("Error", "User data not found. Please log in again.");
            router.replace('/auth');
            return;
        }
        currentFuelingDateTime = await fulingTime();
        const locationResult = await location();
        if (locationResult) {
            currentGpsLocation = locationResult;
        }

        let tripSheetId

        try {
            const userDataString = await AsyncStorage.getItem('userData');
            const userData = userDataString ? JSON.parse(userDataString) : null;
            tripSheetId = userData ? userData['Trip Sheet Id'] : null;
        } catch (error) {
            console.error('Error fetching user data from AsyncStorage:', error);
        }

        if (currentFuelingDateTime && currentGpsLocation) {
            const formData: FormData = {
                orderId,
                vehicleNumberPlateImage,
                tripSheetId,
                vehicleNumber: vehicleNumber.toUpperCase(),
                driverName,
                driverId: driverId.toUpperCase(),
                driverMobile,
                fuelMeterImage,
                slipImage,
                quantityType,
                fuelQuantity,
                gpsLocation: currentGpsLocation,
                fuelingDateTime: currentFuelingDateTime,
                bowser: {
                    regNo: userData.Bowser ? userData.Bowser : '',
                    driver: {
                        name: userData.Name,
                        id: userData['User Id'],
                        phoneNo: userData['Phone Number']
                    }
                },
                allocationAdmin: {
                    name: allocationAdmin.name,
                    id: allocationAdmin.id,
                },
            };

            if (isOnline) {
                try {
                    const response = await fetch(`https://bowser-backend-2cdr.onrender.com/addFuelingTransaction`, { //https://bowser-backend-2cdr.onrender.com // http://192.168.137.1:5000
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(formData),
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const responseData = await response.json();
                    Alert.alert(
                        "Success",
                        responseData.message,
                        [
                            {
                                text: "OK", onPress: () => {
                                }
                            }
                        ],
                        { cancelable: false }
                    );
                    resetForm();
                    navigation.navigate('index' as never);
                } catch (err) {
                    let errorMessage = 'An unknown error occurred';

                    if (err instanceof Response) {
                        try {
                            const errorData = await err.json();
                            errorMessage = errorData.message || errorData.error || errorMessage;
                        } catch (jsonError) {
                        }
                    } else if (err instanceof Error) {
                        errorMessage = err.message;
                    }

                    Alert.alert(
                        "Error",
                        errorMessage,
                        [
                            {
                                text: "OK", onPress: () => {
                                }
                            }
                        ],
                        { cancelable: false }
                    );
                } finally {
                    setFormSubmitting(false);
                }
            } else {
                try {
                    Alert.alert(
                        "No Internet Connection",
                        "Please connect to the internet. Waiting for 10 seconds...",
                        [{ text: "OK" }]
                    );

                    // Wait for 10 seconds
                    await new Promise(resolve => setTimeout(resolve, 10000));

                    // Check internet connection again
                    const netInfo = await NetInfo.fetch();
                    if (netInfo.isConnected) {
                        // If now connected, try to submit the form again
                        setIsOnline(true);
                        submitDetails();
                        return;
                    }

                    // If still offline, ask to save data offline
                    Alert.alert(
                        "Still Offline",
                        "Do you want to save the data offline?",
                        [
                            {
                                text: "Yes",
                                onPress: async () => {
                                    const offlineData = await AsyncStorage.getItem('offlineFuelingData');
                                    let offlineArray = offlineData ? JSON.parse(offlineData) : [];
                                    offlineArray.push(formData);
                                    await AsyncStorage.setItem('offlineFuelingData', JSON.stringify(offlineArray));
                                    Alert.alert(
                                        "Success",
                                        "Data saved offline. It will be submitted when you're back online.",
                                        [{ text: "OK", onPress: () => { } }],
                                        { cancelable: false }
                                    );
                                    resetForm();
                                    navigation.navigate('index' as never);
                                }
                            },
                            {
                                text: "No",
                                onPress: () => {
                                    setFormSubmitting(false);
                                },
                                style: "cancel"
                            }
                        ]
                    );
                } catch (error) {
                    Alert.alert(
                        "Error",
                        "Failed to handle offline data. Please try again.",
                        [{ text: "OK", onPress: () => { } }],
                        { cancelable: false }
                    );
                } finally {
                    setFormSubmitting(false);
                }
            }
        }
    }
    const resetForm = () => {
        setVehicleNumberPlateImage(null);
        setFuelMeterImage(null);
        setSlipImage(null);
        setFuelQuantity('0');
        setGpsLocation('');
        setFuelingDateTime('');
    }
    // form data handling
    const imageToBase64 = async (uri: string): Promise<string> => {
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        return `data:image/jpeg;base64,${base64}`;
    };
    const openNumberPlateCamera = async () => {
        if (vehicleNumberPlateImage) {
            return;
        }
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            alert("Camera permission is required!");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled && result.assets[0].uri) {
            const compressedImage = await compressImage(result.assets[0].uri);
            setVehicleNumberPlateImage(compressedImage);
            setVehicleNumberPlateImageSize(calculateBase64Size(compressedImage));
        }
    };
    const openFuelMeterCamera = async () => {
        if (fuelMeterImage) {
            return;
        }
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            alert("Camera permission is required!");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled && result.assets[0].uri) {
            const compressedImage = await compressImage(result.assets[0].uri);
            setFuelMeterImage(compressedImage);
            setFuelMeterImageSize(calculateBase64Size(compressedImage));
        }
    };
    const openSlipCamera = async () => {
        if (slipImage) {
            return;
        }
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            alert("Camera permission is required!");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled && result.assets[0].uri) {
            const compressedImage = await compressImage(result.assets[0].uri);
            setSlipImage(compressedImage);
            setSlipImageSize(calculateBase64Size(compressedImage));
        }
    };
    // Input validation
    const validateInputs = () => {
        if (!vehicleNumber) {
            alert("Vehicle Number is required.");
            vehicleNumberInputRef.current?.measureLayout(
                scrollViewRef.current?.getInnerViewNode(),
                (x, y) => {
                    scrollViewRef.current?.scrollTo({ y: y, animated: true });
                }
            );
            return false;
        }
        if (!driverName) {
            alert("Driver Name is required.");
            driverNameInputRef.current?.measureLayout(
                scrollViewRef.current?.getInnerViewNode(),
                (x, y) => {
                    scrollViewRef.current?.scrollTo({ y: y, animated: true });
                }
            );
            return false;
        }
        if (!driverId) {
            alert("Driver ID is required.");
            driverIdInputRef.current?.measureLayout(
                scrollViewRef.current?.getInnerViewNode(),
                (x, y) => {
                    scrollViewRef.current?.scrollTo({ y: y, animated: true });
                }
            );
            return false;
        }
        if (!fuelQuantity) {
            alert("Fuel Quantity is required.");
            fuelQuantityInputRef.current?.measureLayout(
                scrollViewRef.current?.getInnerViewNode(),
                (x, y) => {
                    scrollViewRef.current?.scrollTo({ y: y, animated: true });
                }
            );
            return false;
        }
        return true;
    }

    return (
        <ThemedView style={[styles.container, styles.main]}>
            <ScrollView style={{ backgroundColor: colors.background }}>
                <ThemedView style={styles.section}>
                    <ThemedText type="title">Fuel Dispensing Form</ThemedText>
                    <ThemedText style={{ textAlign: 'center' }}>{Date().toLocaleString()}</ThemedText>
                    <ThemedView style={styles.inputContainer}>
                        <ThemedText>Vehicle Number:</ThemedText>
                        {vehicleNumberPlateImage && (
                            <>
                                <Image source={{ uri: vehicleNumberPlateImage }} style={styles.uploadedImage} />
                                <ThemedText style={styles.imageSizeText}>Size: {vehicleNumberPlateImageSize}</ThemedText>
                            </>
                        )}
                        {!vehicleNumberPlateImage && (
                            <TouchableOpacity
                                onPress={() => vehicleNumberPlateImage === null ? openNumberPlateCamera() : null}
                                style={[styles.photoButton]}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="car-outline" size={20} color="white" style={{ marginRight: 5 }} />
                                    <ThemedText style={{ color: 'white' }}>
                                        Take Vehicle Number Plate Photo
                                    </ThemedText>
                                </View>
                            </TouchableOpacity>
                        )}
                        <TextInput
                            readOnly
                            ref={vehicleNumberInputRef}
                            // onPress={() => vehicleNumber === '' ? openNumberPlateCamera() : null}
                            style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                            placeholder="Enter vehicle number"
                            placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                            value={vehicleNumber}
                            returnKeyType="next"
                            onSubmitEditing={() => driverNameInputRef.current?.focus()}
                            blurOnSubmit={false}
                        />
                    </ThemedView>

                    <ThemedView style={styles.section}>

                        <ThemedView style={styles.inputContainer}>
                            <ThemedText>Driver ID:</ThemedText>
                            <TextInput
                                ref={driverIdInputRef}
                                readOnly
                                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                                placeholder="Enter driver ID"
                                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                                value={driverId}
                                keyboardType="phone-pad"
                                returnKeyType="next"
                                onSubmitEditing={() => driverNameInputRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </ThemedView>
                        <ThemedView style={styles.inputContainer}>
                            <ThemedText>Driver Name:</ThemedText>
                            <TextInput
                                ref={driverNameInputRef}
                                readOnly
                                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                                placeholder="Enter driver name"
                                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                                value={driverName}
                                returnKeyType="next"
                                onSubmitEditing={() => driverMobileInputRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </ThemedView>
                        <ThemedView style={styles.inputContainer}>
                            <ThemedText>Driver Mobile Number:</ThemedText>
                            <TextInput
                                ref={driverMobileInputRef}
                                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                                placeholder="Enter mobile number"
                                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                                keyboardType="phone-pad"
                                value={driverMobileNo}
                                onChangeText={setDriverMobileNo}
                                returnKeyType="next"
                                onSubmitEditing={() => fuelQuantityInputRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </ThemedView>
                    </ThemedView>

                    <ThemedView style={styles.section}>
                        <ThemedView style={styles.inputContainer}>
                            {fuelMeterImage && (
                                <>
                                    <Image source={{ uri: fuelMeterImage }} style={styles.uploadedImage} />
                                    <ThemedText style={styles.imageSizeText}>Size: {fuelMeterImageSize}</ThemedText>
                                </>
                            )}
                            {!fuelMeterImage && (
                                <TouchableOpacity
                                    onPress={() => fuelMeterImage === null ? openFuelMeterCamera() : null}
                                    style={[styles.photoButton]}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="speedometer-outline" size={20} color="white" style={{ marginRight: 5 }} />
                                        <ThemedText style={{ color: 'white' }}>
                                            Take Fuel Meter Photo
                                        </ThemedText>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {slipImage && (
                                <>
                                    <Image source={{ uri: slipImage }} style={styles.uploadedImage} />
                                    <ThemedText style={styles.imageSizeText}>Size: {slipImageSize}</ThemedText>
                                </>
                            )}
                            {!slipImage && (
                                <TouchableOpacity
                                    onPress={() => slipImage === null ? openSlipCamera() : null}
                                    style={[styles.photoButton]}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="receipt-outline" size={20} color="white" style={{ marginRight: 5 }} />
                                        <ThemedText style={{ color: 'white' }}>
                                            Take Slip Photo
                                        </ThemedText>
                                    </View>
                                </TouchableOpacity>
                            )}
                            <ThemedText>Fuel Quantity Dispensed:</ThemedText>

                            <View style={styles.rowContainer}>
                                <TextInput
                                    ref={fuelQuantityInputRef}
                                    readOnly
                                    style={[styles.input, styles.quarterInput, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                                    placeholder="Quantity type"
                                    placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                                    value={quantityType}
                                    returnKeyType="next"
                                    onSubmitEditing={() => fuelQuantityInputRef.current?.focus()}
                                    blurOnSubmit={false}
                                />
                                <TextInput
                                    ref={fuelQuantityInputRef}
                                    style={[styles.input, styles.threeQuarterInput, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                                    placeholder="Fuel quantity"
                                    placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                                    keyboardType="numeric"
                                    value={fuelQuantity.toString()}
                                    returnKeyType="next"
                                    onChangeText={(text) => {
                                        setFuelQuantity(text);
                                    }}
                                    readOnly={false}
                                    onSubmitEditing={() => gpsLocationInputRef.current?.focus()}
                                    blurOnSubmit={false}
                                />
                            </View>
                        </ThemedView>
                    </ThemedView>

                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={submitDetails}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            <ThemedText style={styles.submitButtonText}>Submit</ThemedText>
                            <Ionicons name="send-outline" size={20} color="white" />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.resetButton}
                        onPress={resetForm}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            <ThemedText style={styles.resetButtonText}>Reset</ThemedText>
                            <Ionicons name="refresh-outline" size={20} color="white" />
                        </View>
                    </TouchableOpacity>
                </ThemedView>
            </ScrollView>
            {formSubmitting && (
                <ThemedView style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </ThemedView>
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    main: {
        paddingTop: 70,
        paddingHorizontal: 10,
    },
    containerTitles: {
        paddingTop: 4,
        paddingBottom: 4,
    },
    resetButton: {
        padding: 10,
        backgroundColor: 'gray',
        borderRadius: 5,
        marginBottom: 10,
    },
    resetButtonText: {
        fontWeight: 'bold',
        textAlign: 'center'
    },
    container: {
        flex: 1,
    },
    scrollViewContent: {
        flexGrow: 1,
    },
    formContainer: {
        padding: 16,
        gap: 16,
    },
    section: {
        marginBottom: 8,
    },
    inputContainer: {
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        padding: 8,
        marginTop: 4,
    },
    imageUploadContainer: {
        alignItems: 'center',
        marginTop: 8,
    },
    uploadButton: {
        backgroundColor: '#0a7ea4',
        padding: 8,
        borderRadius: 4,
        marginBottom: 8,
    },
    uploadedImage: {
        borderBlockColor: 'white',
        borderWidth: 1,
        width: 350,
        minHeight: 150,
        maxHeight: 250,
        resizeMode: 'contain',
        alignSelf: 'center',
        borderRadius: 4,
    },
    submitButton: {
        backgroundColor: '#0a7ea4',
        padding: 16,
        borderRadius: 4,
        alignItems: 'center',
        marginBottom: 10,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    photoButton: {
        backgroundColor: '#0a7ea4',
        padding: 12,
        borderRadius: 4,
        marginVertical: 20,
        alignItems: 'center'
    },
    loaderContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerContainer: {
        marginBottom: 8,
        textAlign: 'center',
        alignItems: 'center',
        marginVertical: 10,
    },
    picker: {
        height: 50,
        width: '100%',
    },
    errorText: {
        color: 'red',
        marginBottom: 8,
    },
    modalContainer: {
        flex: 1,
        marginTop: 50,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    driverItem: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    closeButton: {
        padding: 10,
        alignItems: 'center',
    },
    rowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quarterInput: {
        flex: 0.30,
        marginRight: 4,
    },
    threeQuarterInput: {
        flex: 0.70,
        marginLeft: 4,
    },
    imageSizeText: {
        textAlign: 'center',
        marginTop: 4,
        fontSize: 12,
    },
});
