import mongoose from 'mongoose';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, ScrollView, View, ActivityIndicator, Button, Alert, Modal, FlatList } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation, useTheme } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Driver, FormData, Vehicle } from '@/src/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';


export default function FuelingScreen() {
  // declare state variables---->
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const { colors } = useTheme();
  const [vehicleNumberPlateImage, setVehicleNumberPlateImage] = useState<string | null>(null);
  const [fuelMeterImage, setFuelMeterImage] = useState<string | null>(null);
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverId, setDriverId] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [fuelQuantity, setFuelQuantity] = useState<string>('0');
  const [gpsLocation, setGpsLocation] = useState('');
  const [fuelingDateTime, setFuelingDateTime] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [foundDrivers, setFoundDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [noDriverFound, setNoDriverFound] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [quantityType, setQuantityType] = useState<'Full' | 'Part'>('Part');
  const [vehicleNumberPlateImageSize, setVehicleNumberPlateImageSize] = useState<string>('');
  const [fuelMeterImageSize, setFuelMeterImageSize] = useState<string>('');
  const [slipImageSize, setSlipImageSize] = useState<string>('');
  const [isOnline, setIsOnline] = useState(true);
  const [foundVehicles, setFoundVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [noVehicleFound, setNoVehicleFound] = useState(false);
  const [isSearchingVehicle, setIsSearchingVehicle] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);

  // declare refs for input fields---->
  const vehicleNumberInputRef = React.useRef<TextInput>(null);
  const driverNameInputRef = React.useRef<TextInput>(null);
  const driverIdInputRef = React.useRef<TextInput>(null);
  const driverMobileInputRef = React.useRef<TextInput>(null);
  const fuelQuantityInputRef = React.useRef<TextInput>(null);
  const gpsLocationInputRef = React.useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null); // Ref for ScrollView
  const driversData: (Driver | { Name: string, ITPLId: string })[] = [
    { Name: "Select a driver", ITPLId: "placeholder" },
    ...foundDrivers
  ];

  // function declarations---->
  // startup function

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);
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
    if (!validateInputs()) {
      setFormSubmitting(false);
      return;
    }

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

    if (currentFuelingDateTime && currentGpsLocation) {
      const formData: FormData = {
        // orderId: new mongoose.Types.ObjectId(''),
        vehicleNumberPlateImage,
        vehicleNumber: vehicleNumber.toUpperCase(),
        driverName,
        driverId: driverId.toUpperCase(),
        driverMobile,
        fuelMeterImage,
        slipImage,
        fuelQuantity,
        quantityType,
        gpsLocation: currentGpsLocation,
        fuelingDateTime: currentFuelingDateTime,
        bowserDriver: {
          _id: new mongoose.Types.ObjectId(userData._id),
          userName: userData.Name,
          userId: userData['User Id']
        },
      };



      if (isOnline) {
        try {
          const response = await fetch(`https://bowser-backend-2cdr.onrender.com/formsubmit`, {
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
          console.error('Fetch error:', err); // Log any fetch errors
          let errorMessage = 'An unknown error occurred';

          if (err instanceof Response) {
            try {
              const errorData = await err.json();
              errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (jsonError) {
              console.error('Error parsing JSON:', jsonError);
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
          console.error('Error handling offline data:', error);
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
    setVehicleNumber('');
    setDriverName('');
    setDriverId('');
    setDriverMobile('');
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
  const searchDriverById = async (idNumber: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`https://bowser-backend-2cdr.onrender.com/searchDriver/${idNumber}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('No driver found with the given ID');
          setFoundDrivers([]);
          setNoDriverFound(true);
          return;
        }
        throw new Error('Server error');
      }

      const drivers: Driver[] = await response.json();
      setFoundDrivers(drivers);
      setNoDriverFound(false);

      // Automatically open the selection modal if drivers are found
      if (drivers.length > 0) {
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Error searching for driver:', error);
      setFoundDrivers([]);
      setNoDriverFound(true);
    } finally {
      setIsSearching(false);
    }
  }
  const renderDriverItem = ({ item }: { item: Driver | { Name: string, ITPLId: string } }) => (
    <TouchableOpacity
      style={[styles.driverItem, { backgroundColor: colors.card }]}
      onPress={() => handleDriverSelection(item.Name)}
    >
      <Text style={{ color: colors.text }}>{item.Name}</Text>
    </TouchableOpacity>
  );
  const handleDriverSelection = (driverName: string) => {
    setSelectedDriver(driverName);
    setModalVisible(false);
    const selectedDriverData = foundDrivers.find(driver => driver.Name === driverName);
    if (selectedDriverData) {
      if (selectedDriverData.MobileNo && selectedDriverData.MobileNo.length > 0) {
        const lastUsedNumber = selectedDriverData.MobileNo.find(num => num.LastUsed);
        const defaultNumber = selectedDriverData.MobileNo.find(num => num.IsDefaultNumber);
        const firstNumber = selectedDriverData.MobileNo[0];

        setDriverMobile((lastUsedNumber || defaultNumber || firstNumber)?.MobileNo || '');
      } else {
        setDriverMobile('');
      }

      // Extract ID from name
      const idMatch = selectedDriverData.Name.match(/(?:ITPL-?\d+|\(ITPL-?\d+\))/i);
      let cleanName = selectedDriverData.Name.trim();
      let recognizedId = '';
      if (idMatch) {
        recognizedId = idMatch[0].replace(/[()]/g, '').toUpperCase();
        cleanName = cleanName.replace(/(?:\s*[-\s]\s*|\s*\(|\)\s*)(?:ITPL-?\d+|\(ITPL-?\d+\))/i, '').trim();
      }

      setDriverName(cleanName);

      if (recognizedId) {
        setDriverId(recognizedId);
      } else if (selectedDriverData.ITPLId) {
        setDriverId(selectedDriverData.ITPLId);
      } else {
        setDriverId(cleanName);
        Alert.alert(
          "Error",
          'Id unrecognised',
          [
            {
              text: "OK", onPress: () => {
              }
            }
          ],
          { cancelable: false }
        );
      }
    }
  }
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
  const searchVehicleByNumber = async (vehicleNumber: string) => {
    setIsSearchingVehicle(true);
    try {
      const response = await fetch(`https://bowser-backend-2cdr.onrender.com/searchVehicleNumber/${vehicleNumber}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('No vehicle found with the given number');
          setFoundVehicles([]);
          setNoVehicleFound(true);
          return;
        }
        throw new Error('Server error');
      }

      const vehicles: Vehicle[] = await response.json();
      console.log('Vehicles found:', vehicles); // Add this line for debugging
      setFoundVehicles(vehicles);
      setNoVehicleFound(false);

      if (vehicles.length > 0) {
        setVehicleModalVisible(true);
      }
    } catch (error) {
      console.error('Error searching for vehicle:', error);
      setFoundVehicles([]);
      setNoVehicleFound(true);
    } finally {
      setIsSearchingVehicle(false);
    }
  }

  return (
    <View style={[styles.container, styles.main]}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollViewContent}>
        <ThemedView style={styles.formContainer}>
          <View style={{ height: 60 }} />
          <ThemedText type="title">Fuel Dispensing Form</ThemedText>
          <ThemedView style={styles.section}>
            <ThemedText style={{ textAlign: 'center' }}>{Date().toLocaleString()}</ThemedText>
          </ThemedView>

          <ThemedView style={styles.section}>
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
            <ThemedView style={styles.inputContainer}>
              <ThemedText>Vehicle Number:</ThemedText>
              <TextInput
                ref={vehicleNumberInputRef}
                onPress={() => !vehicleNumberPlateImage && openNumberPlateCamera()}
                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                placeholder="Enter vehicle number"
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                value={vehicleNumber}
                onChangeText={(text) => {
                  setVehicleNumber(text.toUpperCase());
                  if (text.length > 2) {
                    setFoundVehicles([]);
                    setNoVehicleFound(false);
                    searchVehicleByNumber(text);
                  }
                }}
                returnKeyType="next"
                onSubmitEditing={() => driverIdInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </ThemedView>
            {noVehicleFound && (
              <ThemedText style={styles.errorText}>No vehicle found with the given number</ThemedText>
            )}
            {!noVehicleFound && !(vehicleNumber == "") && <TouchableOpacity
              style={[styles.pickerContainer,]}
              onPress={() => setVehicleModalVisible(true)}
            >
              <Text style={{ color: colors.text }}>{selectedVehicle || "Select a vehicle"}</Text>
            </TouchableOpacity>}
            <Modal
              visible={vehicleModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setVehicleModalVisible(false)}
            >
              <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setVehicleModalVisible(false)}
                >
                  <Text style={{ color: colors.text }}>Close</Text>
                </TouchableOpacity>
                <FlatList
                  data={foundVehicles}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.vehicleItem, { backgroundColor: colors.card }]}
                      onPress={() => {
                        setSelectedVehicle(item.VehicleNo);
                        setVehicleNumber(item.VehicleNo);
                        setVehicleModalVisible(false);
                      }}
                    >
                      <Text style={{ color: colors.text }}>{item.VehicleNo}</Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.VehicleNo}
                />
              </View>
            </Modal>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedView style={styles.inputContainer}>
              <ThemedText>Driver ID:</ThemedText>
              <TextInput
                ref={driverIdInputRef}
                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                placeholder="Enter driver ID"
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                value={driverId}
                onChangeText={(text) => {
                  setDriverId(text);
                  if (text.length > 3 && !(text == "")) {
                    setFoundDrivers([]);
                    setNoDriverFound(false);
                    searchDriverById(text);
                  }
                }}
                keyboardType="default"
                onSubmitEditing={() => driverNameInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </ThemedView>
            {noDriverFound && (
              <ThemedText style={styles.errorText}>No driver found with the given ID</ThemedText>
            )}
            {!noDriverFound && !(driverId == "") && <TouchableOpacity
              style={[styles.pickerContainer,]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={{ color: colors.text }}>{selectedDriver || "Select a driver"}</Text>
            </TouchableOpacity>}
            <Modal
              visible={modalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setModalVisible(false)}
            >
              <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={{ color: colors.text }}>Close</Text>
                </TouchableOpacity>
                <FlatList
                  data={driversData}
                  renderItem={renderDriverItem}
                  keyExtractor={(item, index) => item.ITPLId || item.Name + index}
                />
              </View>
            </Modal>

            <ThemedView style={styles.inputContainer}>
              <ThemedText>Driver Name:</ThemedText>
              <TextInput
                ref={driverNameInputRef}
                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                placeholder="Enter driver name"
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                value={driverName}
                onChangeText={setDriverName}
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
                value={driverMobile}
                onChangeText={setDriverMobile}
                returnKeyType="next"
                onSubmitEditing={() => fuelQuantityInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.section}>
            {fuelMeterImage && (
              <>
                <Image source={{ uri: fuelMeterImage }} style={styles.uploadedImage} />
                <ThemedText style={styles.imageSizeText}>Size: {fuelMeterImageSize}</ThemedText>
              </>
            )}
            {!fuelMeterImage && <TouchableOpacity
              onPress={() => fuelMeterImage === null ? openFuelMeterCamera() : null}
              style={[styles.photoButton,]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="speedometer-outline" size={20} color="white" style={{ marginRight: 5 }} />
                <ThemedText style={{ color: 'white' }}>
                  Take Fuel Meter Photo
                </ThemedText>
              </View>
            </TouchableOpacity>}

            {slipImage && (
              <>
                <Image source={{ uri: slipImage }} style={styles.uploadedImage} />
                <ThemedText style={styles.imageSizeText}>Size: {slipImageSize}</ThemedText>
              </>
            )}
            {!slipImage && <TouchableOpacity
              onPress={() => slipImage === null ? openSlipCamera() : null}
              style={[styles.photoButton,]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="receipt-outline" size={20} color="white" style={{ marginRight: 5 }} />
                <ThemedText style={{ color: 'white' }}>
                  Take Slip Photo
                </ThemedText>
              </View>
            </TouchableOpacity>}

            <ThemedView style={styles.inputContainer}>
              <ThemedText>Fuel Quantity Dispensed:</ThemedText>
              <View style={styles.rowContainer}>
                <Picker
                  style={[
                    styles.input,
                    styles.quarterInput,
                    {
                      color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                    }
                  ]}
                  selectedValue={quantityType}
                  onValueChange={(itemValue) => {
                    setQuantityType(itemValue);
                    fuelQuantityInputRef.current?.focus();
                  }}
                  dropdownIconColor={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
                >
                  <Picker.Item label="Full" value="Full" />
                  <Picker.Item label="Part" value="Part" />
                </Picker>
                <TextInput
                  onFocus={() => {
                    if (!fuelMeterImage) {
                      openFuelMeterCamera();
                    }
                  }}
                  onPress={() => !fuelMeterImage && openFuelMeterCamera()}
                  ref={fuelQuantityInputRef}
                  style={[styles.input, styles.threeQuarterInput, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                  placeholder="Enter fuel quantity"
                  placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                  keyboardType="numeric"
                  value={fuelQuantity.toString()}
                  onChangeText={(text) => {
                    setFuelQuantity(text);
                  }}
                  returnKeyType="next"
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
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      )}
      {(isSearching || isSearchingVehicle) && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    backgroundColor: 'dark',
  },
  containerTitles: {
    paddingTop: 4,
    paddingBottom: 4,
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
  vehicleItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

