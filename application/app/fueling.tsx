import { Image, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, ScrollView, View, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useNavigation, useTheme } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Driver, FormData, Vehicle } from '@/src/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { compressImage } from '@/src/utils/imageManipulation';


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
  const [fuelQuantity, setFuelQuantity] = useState<string>('');
  const [gpsLocation, setGpsLocation] = useState('');
  const [fuelingDateTime, setFuelingDateTime] = useState('');
  const [tripSheetId, setTripSheetId] = useState('');
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
  const [driverMobileNotFound, setDriverMobileNotFound] = useState(false);

  // declare refs for input fields---->
  const vehicleNumberInputRef = React.useRef<TextInput>(null);
  const driverNameInputRef = React.useRef<TextInput>(null);
  const driverIdInputRef = React.useRef<TextInput>(null);
  const driverMobileInputRef = React.useRef<TextInput>(null);
  const fuelQuantityInputRef = React.useRef<TextInput>(null);
  const gpsLocationInputRef = React.useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
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

  const location = async (): Promise<string | { error: string }> => {
    // Request location permissions
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { error: "Location permission denied" };
    }

    try {
      // Attempt to get the current position
      let location: Location.LocationObject = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Reverse geocode to get city name
      let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      let city = geocode[0]?.city || 'City not found';

      // Format the coordinates and return
      const coordinates = `Latitude ${latitude}, Longitude ${longitude}`;
      const fuelLocation = `Bowser at ${city}, ${coordinates}`;

      setGpsLocation(fuelLocation);
      return fuelLocation;
    } catch (error) {
      console.error("Error getting location or city:", error);
      return { error: "Unable to retrieve location. Please check your internet connection." };
    }
  };

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

  const submitDetails = async () => {
    setFormSubmitting(true);
    // if (!validateInputs()) {
    //   setFormSubmitting(false);
    //   return;
    // }

    if (driverMobileNotFound && driverMobile && isOnline) {
      try {
        const updateResponse = await fetch(`https://bowser-backend-2cdr.onrender.com/searchDriver/updateDriverMobile`, { //https://bowser-backend-2cdr.onrender.com http://192.168.137.1:5000
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ driverId, driverMobile }),
        });

        if (!updateResponse.ok) {
          throw new Error(`Failed to update driver mobile number: ${updateResponse.status}`);
        }

        await submitFormData();
      } catch (error) {
        console.error('Error updating driver mobile number:', error);
        Alert.alert("Error", "Failed to update driver mobile number. Please try again.");
      } finally {
        setFormSubmitting(false);
      }
    } else {
      await submitFormData();
    }
  }

  const submitFormData = async () => {
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

    if (typeof locationResult === 'string') {
      currentGpsLocation = locationResult;
    } else if (typeof locationResult === 'object' && locationResult.error) {
      Alert.alert(
        "Location Error",
        locationResult.error,
        [{ text: "OK" }]
      );
    }


    // Prepare formData
    const formData: FormData = {
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
      gpsLocation: currentGpsLocation, // This may still be the previous value if location failed
      fuelingDateTime: currentFuelingDateTime,
      bowser: {
        regNo: userData.Bowser ? userData.Bowser : '',
        driver: {
          name: userData.Name,
          id: userData['User Id'],
          phoneNo: userData['Phone Number']
        }
      }
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
        console.error('Fetch error:', err);
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
        const netInfo = await NetInfo.fetch();
        if (netInfo.isConnected) {
          setIsOnline(true);
          submitDetails();
          return;
        }

        // If still offline, ask to save data offline
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
          alert('No driver found with the given ID');
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
        setDriverMobileNotFound(true);
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
    if (!vehicleNumberPlateImage) {
      alert("Vehicle number plate image is required.");
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
    if (!fuelMeterImage) {
      alert("Vehicle number plate image is required.");
      return false;
    }
    if (!slipImage) {
      alert("Vehicle number plate image is required.");
      return false;
    }
    if (!fuelQuantity || Number(fuelQuantity) < 1) {
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
          alert('No vehicle found with the given number');
          setFoundVehicles([]);
          setNoVehicleFound(true);
          return;
        }
        throw new Error('Server error');
      }

      const vehicles: Vehicle[] = await response.json();
      setFoundVehicles(vehicles);
      setNoVehicleFound(false);

      if (vehicles.length > 0) {
        setVehicleModalVisible(true);
      }
    } catch (error) {
      setFoundVehicles([]);
      setNoVehicleFound(true);
    } finally {
      setIsSearchingVehicle(false);
    }
  }

  // Function to fetch and validate trip sheet
  const validateTrip = async (): Promise<boolean> => {
    if (isOnline && tripSheetId) {
      try {
        const baseUrl = 'https://bowser-backend-2cdr.onrender.com' //'http://192.168.137.1:5000';
        const endpoint = `/tripSheet/all?tripSheetId=${encodeURIComponent(tripSheetId)}&unsettled=true`;

        // Fetch data
        const response = await fetch(`${baseUrl}${endpoint}`);
        if (!response.ok) {
          throw new Error('Failed to fetch trip sheet');
        }

        const sheets = await response.json();

        return sheets.length > 0;
      } catch (error) {
        console.error('Error fetching unsettled trip sheets:', (error as Error).message);
        return false;
      }
    }
    return false;
  };

  // Function to get the tripSheetId from AsyncStorage
  const getUserTripSheetId = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      const userData = userDataString ? JSON.parse(userDataString) : null;
      const tripSheetId = userData ? userData['Trip Sheet Id'] : null;
      setTripSheetId(tripSheetId);
    } catch (error) {
      console.error('Error fetching user data from AsyncStorage:', error);
    }
  };

  // Effect to validate the trip once tripSheetId is set
  useEffect(() => {
    const checkTripValidity = async () => {
      await getUserTripSheetId();

      if (tripSheetId) {
        const isValidTrip = await validateTrip();
        if (!isValidTrip) {
          Alert.alert('Error', 'Your Trip is closed.');
          router.replace('/');
        }
      }
    };

    checkTripValidity();
  }, [tripSheetId]);


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
            <ThemedView style={styles.inputContainer}>
              <ThemedText>Trip Sheet Number: {tripSheetId}</ThemedText>
            </ThemedView>
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
                  if (text.length > 3) {
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

