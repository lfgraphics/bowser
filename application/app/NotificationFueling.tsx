import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { ThemedView } from '@/components/ThemedView';
import { Image, Platform, TextInput, TouchableOpacity, useColorScheme, ScrollView, ActivityIndicator, Button } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';

interface RouteParams {
    vehicleNumber: string;
    driverId: string;
    driverMobile: string;
    driverName: string;
    quantityType: "Part" | "Full";
    fuelQuantity: string;
}

export default function NotificationFuelingScreen() {
    const route = useRoute();
    const {
        vehicleNumber = 'N/A',
        driverId = 'N/A',
        driverMobile = 'N/A',
        driverName = 'N/A',
        quantityType = 'N/A',
        fuelQuantity: initialFuelQuantity = 'N/A'
    } = route.params as RouteParams;


    // declare state variables---->
    const colorScheme = useColorScheme();
    const [vehicleNumberPlateImage, setVehicleNumberPlateImage] = useState<string | null>(null);
    const [fuelMeterImage, setFuelMeterImage] = useState<string | null>(null);
    // const [vehicleNumber, setVehicleNumber] = useState('');
    // const [driverName, setDriverName] = useState('');
    // const [driverId, setDriverId] = useState('');
    // const [driverMobile, setDriverMobile] = useState('');
    const [fuelQuantity, setFuelQuantity] = useState(initialFuelQuantity);
    const [gpsLocation, setGpsLocation] = useState('');
    const [fuelingDateTime, setFuelingDateTime] = useState('');
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [imageProcessing, setImageprocessing] = useState(false);

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
                console.warn('Location permission is still not granted.');
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

    // form submit reset
    const submitDetails = async () => {

        if (!validateInputs()) {
            return;
        }

        let currentFuelingDateTime = fuelingDateTime;
        let currentGpsLocation = gpsLocation;

        // if (!currentFuelingDateTime) {
        currentFuelingDateTime = await fulingTime();
        // console.log('Time', currentFuelingDateTime);
        // }
        // if (!currentGpsLocation) {
        const locationResult = await location();
        if (locationResult) {
            currentGpsLocation = locationResult;
            // console.log('Coordinates are - ', currentGpsLocation);
        }
        // }
        if (currentFuelingDateTime && currentGpsLocation) {
            const formData = JSON.stringify({
                vehicleNumberPlateImage,
                vehicleNumber,
                driverName,
                driverId,
                driverMobile,
                fuelMeterImage,
                fuelQuantity,
                quantityType,
                gpsLocation,
                fuelingDateTime
            });

            try {
                const response = await fetch('http://192.168.137.1:5000/formsubmit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: formData,
                });
                if (!response.ok) { // Check if response status is OK (status 200-299)
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const responseData = await response.json();
                console.log('Response:', responseData);
                alert(`Success: ${responseData.message}`);
            } catch (err) {
                console.error('Fetch error:', err); // Log any fetch errors
            }
        }
    }
    const resetForm = () => {
        setVehicleNumberPlateImage(null);
        setFuelMeterImage(null);
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
            const base64Image = await imageToBase64(result.assets[0].uri);
            setVehicleNumberPlateImage(base64Image)
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
            const base64Image = await imageToBase64(result.assets[0].uri);
            setFuelMeterImage(base64Image);

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
        if (!driverMobile) {
            alert("Driver Mobile Number is required.");
            driverMobileInputRef.current?.measureLayout(
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
        <View style={[styles.container, styles.main]}>
            <ScrollView>
                <ThemedView style={styles.section}>
                    <ThemedText style={{ textAlign: 'center' }}>{Date().toLocaleString()}</ThemedText>

                    {vehicleNumberPlateImage && (
                        <Image source={{ uri: vehicleNumberPlateImage }} style={styles.uploadedImage} />
                    )}
                    <ThemedView style={styles.inputContainer}>
                        <ThemedText>Vehicle Number:</ThemedText>
                        {!vehicleNumberPlateImage && <TouchableOpacity
                            onPress={() => fuelMeterImage === null ? openNumberPlateCamera() : null}
                            style={[styles.photoButton, { display: fuelMeterImage ? 'none' : 'flex' }]}
                        >
                            <ThemedText>Take Vehicle Number Plate Photo</ThemedText>
                        </TouchableOpacity>}
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
                                onSubmitEditing={() => driverMobileInputRef.current?.focus()}
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
                                onSubmitEditing={() => driverIdInputRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </ThemedView>
                        <ThemedView style={styles.inputContainer}>
                            <ThemedText>Driver Mobile Number:</ThemedText>
                            <TextInput
                                ref={driverMobileInputRef}
                                readOnly
                                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                                placeholder="Enter mobile number"
                                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                                keyboardType="phone-pad"
                                value={driverMobile}
                                returnKeyType="next"
                                onSubmitEditing={() => fuelQuantityInputRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </ThemedView>
                    </ThemedView>

                    <ThemedView style={styles.section}>

                        {fuelMeterImage && (
                            <Image source={{ uri: fuelMeterImage }} style={styles.uploadedImage} />
                        )}
                        <ThemedView style={styles.inputContainer}>
                            <ThemedText>Fuel Quantity Dispensed:</ThemedText>
                            {!fuelMeterImage && <TouchableOpacity
                                onPress={() => fuelMeterImage === null ? openFuelMeterCamera() : null}
                                style={[styles.photoButton, { display: fuelMeterImage ? 'none' : 'flex' }]}
                            >
                                <ThemedText>Take Fuel Meter Photo</ThemedText>
                            </TouchableOpacity>}
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
                                    value={fuelQuantity}
                                    returnKeyType="next"
                                    onChangeText={setFuelQuantity}
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
                        <ThemedText style={styles.submitButtonText}>Submit</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.resetButton}
                        onPress={resetForm}
                    >
                        <ThemedText style={styles.resetButtonText}>Reset</ThemedText>
                    </TouchableOpacity>
                </ThemedView>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    main: {
        backgroundColor: '#11181C',
        paddingTop: 80,
        paddingHorizontal: 20
    },
    container: {
        flex: 1,
        backgroundColor: '#11181C',
    },
    photoButton: {
        backgroundColor: '#0a7ea4',
        padding: 12,
        borderRadius: 4,
        marginVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        alignContent: 'center',
        textAlign: 'center',
    },
    detail: {
        fontSize: 16,
        marginBottom: 4,
        color: '#ECEDEE',
        backgroundColor: '#11181C',
    },
    section: {
        backgroundColor: '#11181C',
    },
    inputContainer: {
        marginBottom: 8,
        backgroundColor: '#11181C',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        padding: 8,
        marginTop: 4,
    },
    rowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quarterInput: {
        flex: 0.25,
        marginRight: 4,
    },
    threeQuarterInput: {
        flex: 0.75,
        marginLeft: 4,
    },
    uploadedImage: {
        borderBlockColor: 'white',
        borderWidth: 1,
        width: 350,
        height: 250,
        resizeMode: 'contain',
        alignSelf: 'center',
        borderRadius: 4,
    },
    submitButton: {
        backgroundColor: '#0a7ea4',
        padding: 12,
        borderRadius: 4,
        marginBottom: 10,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    resetButton: {
        padding: 10,
        backgroundColor: 'gray',
        borderRadius: 5,
    },
    resetButtonText: {
        fontWeight: 'bold',
        textAlign: 'center'
    },
});
