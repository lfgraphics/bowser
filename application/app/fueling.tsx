import * as React from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, ScrollView, View, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Driver, FormData, FuelingTypes, Vehicle } from '@/src/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { compressImage } from '@/src/utils/imageManipulation';


export default function FuelingScreen() {
  // declare state variables---->
  const colorScheme = useColorScheme();
  const { colors } = useTheme();
  const [vehicleNumberPlateImage, setVehicleNumberPlateImage] = useState<string | null>(null);
  const [fuelMeterImage, setFuelMeterImage] = useState<string[] | null>(null);
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [odometer, setOdodmeter] = useState('');
  const [adminId, setAdminId] = useState('');
  const [adminName, setAdminName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverId, setDriverId] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [fuelQuantity, setFuelQuantity] = useState<string>('');
  const [gpsLocation, setGpsLocation] = useState('');
  const [tripSheetId, setTripSheetId] = useState<number>(0);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [foundDrivers, setFoundDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [noDriverFound, setNoDriverFound] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [quantityType, setQuantityType] = useState<'Full' | 'Part'>('Part');
  const [isOnline, setIsOnline] = useState(true);
  const [foundVehicles, setFoundVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [partyName, setPartyName] = useState<string>('');
  const [noVehicleFound, setNoVehicleFound] = useState(false);
  const [isSearchingVehicle, setIsSearchingVehicle] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [driverMobileNotFound, setDriverMobileNotFound] = useState(false);
  const [fueling, setFueling] = useState<FuelingTypes>('Own')

  // declare refs for input fields---->
  const vehicleNumberInputRef = React.useRef<TextInput>(null);
  const partyNameInputRef = React.useRef<TextInput>(null);
  const driverNameInputRef = React.useRef<TextInput>(null);
  const driverIdInputRef = React.useRef<TextInput>(null);
  const driverMobileInputRef = React.useRef<TextInput>(null);
  const fuelQuantityInputRef = React.useRef<TextInput>(null);
  const adminIdInputRef = React.useRef<TextInput>(null);
  const adminNameInputRef = React.useRef<TextInput>(null);
  const odometerInputRef = React.useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const driversData: (Driver | { Name: string, ITPLId: string })[] = [
    { Name: "Select a driver", ITPLId: "placeholder" },
    ...foundDrivers
  ];
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const openModal = (image: string) => {
    setSelectedImage(image);
    setImageModalVisible(true);
  };

  const closeModal = () => {
    setImageModalVisible(false);
    setSelectedImage(null);
  };

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

      const coordinates = `${latitude}, ${longitude}`;

      setGpsLocation(coordinates);
      return coordinates;
    } catch (error) {
      console.error("Error getting location or city:", error);
      return { error: "Unable to retrieve location. Please check your internet connection." };
    }
  };

  const submitDetails = async () => {
    setFormSubmitting(true);
    if (!validateInputs()) {
      setFormSubmitting(false);
      return;
    }

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
    let currentGpsLocation = gpsLocation;
    const userDataString = await AsyncStorage.getItem('userData');
    const userData = userDataString ? JSON.parse(userDataString) : null;
    if (!userData) {
      Alert.alert("Error", "User data not found. Please log in again.");
      router.replace('/auth');
      return;
    }

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

    const formData: FormData = {
      category: fueling,
      party: partyName,
      odometer,
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
      fuelingDateTime: new Date(),
      bowser: {
        regNo: userData.Bowser ? userData.Bowser : '',
        driver: {
          name: userData.Name,
          id: userData['User Id'],
          phoneNo: userData['Phone Number']
        }
      },
      allocationAdmin: {
        id: adminId,
        name: adminName
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
        router.replace('/')
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
        router.replace('/')
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
    setOdodmeter('');
    setPartyName('');
    setDriverId('');
    setDriverName('');
    setDriverMobile('');
    setFuelQuantity('0');
    setAdminId('');
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
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0].uri) {
      const compressedImage = await compressImage(result.assets[0].uri);
      setVehicleNumberPlateImage(compressedImage);
    }
  };
  const openFuelMeterCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      alert("Camera permission is required!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0].uri) {
      const compressedImage = await compressImage(result.assets[0].uri);
      setFuelMeterImage(prevImages => prevImages ? [...prevImages, compressedImage] : [compressedImage]);
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
  const renderDriverItem = ({ item }: { item: Driver }) => (
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

      // Extract ID from namaae
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
    if ((fueling !== "Bulk Sale") && !vehicleNumber) {
      alert("गाड़ी का नंबर डालना ज़रूरी है|");
      vehicleNumberInputRef.current?.measureLayout(
        scrollViewRef.current?.getInnerViewNode(),
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y, animated: true });
        }
      );
      return false;
    }
    if (!vehicleNumberPlateImage) {
      alert("गाड़ी की नंबर प्लेट की फ़ोटो खीचना ज़रूरी है|");
      return false;
    }
    if (fueling == "Own" && !driverId) {
      alert("ड्राईवर की आई-डी भरना ज़रूरी है|");
      driverIdInputRef.current?.measureLayout(
        scrollViewRef.current?.getInnerViewNode(),
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y, animated: true });
        }
      );
      return false;
    }
    if (!driverMobile) {
      alert("ड्राईवर का मोबाइल नंबर भरना ज़रूरी है|");
      driverMobileInputRef.current?.measureLayout(
        scrollViewRef.current?.getInnerViewNode(),
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y, animated: true });
        }
      );
      return false;
    }
    if (!fuelMeterImage) {
      alert("तेल मीटर की फ़ोटो खीचना ज़रूरी है|");
      return false;
    }
    if (!fuelQuantity || Number(fuelQuantity) < 1) {
      alert("दिए हुए तेल की मात्रा भरना ज़रूरी है|");
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
          Alert.alert('भरे गए गाड़ी नम्बर की कोई भी ट्रिप नहीं मिली');
          return;
        }
        throw new Error('सर्वर एरर');
      }

      const vehicles: Vehicle[] = await response.json();
      let foundDrivers: Driver[] = [];
      vehicles.map((vc) => { foundDrivers.push(vc.driverDetails) })
      setFoundDrivers(foundDrivers)
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
        const baseUrl = 'http://192.168.137.1:5000' //'http://192.168.137.1:5000'; //https://bowser-backend-2cdr.onrender.com
        const endpoint = `/tripSheet/all?tripSheetId=${tripSheetId}&unsettled=true`;

        // Fetch data
        const response = await fetch(`${baseUrl}${endpoint}`);
        if (!response.ok) {
          throw new Error('ट्रिप शीत नहीं मिली कृपया दोबारा लॉग इनकरें');
        }

        const sheets = await response.json();

        return sheets.length > 0;
      } catch (error) {
        console.error('आप की आई-डी पर कोई भी खुली हुई ट्रिप नहीं मिली:', (error as Error).message);
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
      setTripSheetId(Number(tripSheetId));
    } catch (error) {
      console.error('आप का डाटा नहीं मिल रहा कृपया दोबारा लॉग इन करें:', error);
    }
  };

  // Effect to validate the trip once tripSheetId is set
  useEffect(() => {
    const checkTripValidity = async () => {
      await getUserTripSheetId();

      if (tripSheetId) {
        const isValidTrip = await validateTrip();
        if (!isValidTrip) {
          Alert.alert('एरर', 'आप की ट्रिप बंद कर दी गई है');
          router.replace('/');
        }
      }
    };

    checkTripValidity();
  }, [tripSheetId]);

  useEffect(() => {
    fueling == "Own" ? setPartyName("Own") : setPartyName("")
  }, [fueling])


  return (
    <View style={[styles.container, styles.main, { backgroundColor: colors.background }]}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollViewContent}>
        <View style={[styles.formContainer, { backgroundColor: colors.background }]}>
          {/* Nav for diffrent type */}
          <View style={[styles.navContainer, { backgroundColor: colors.card }]}>
            {(['Own', 'Attatch', 'Bulk Sale'] as FuelingTypes[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.navButton, fueling === option && styles.activeButton]}
                onPress={() => setFueling(option)}
              >
                <Text style={[styles.submitButtonText, { color: `${fueling == option ? colors.card : colors.text}` }]}>{option == "Own" ? "अपना" : option == "Attatch" ? "अटैच" : "सेल"}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ThemedText type="title">Fuel Dispensing Form</ThemedText>
          <View style={styles.section}>
            <ThemedText style={{ textAlign: 'center' }}>{Date().toLocaleString()}</ThemedText>
          </View>
          <View style={styles.section}>
            <View style={styles.inputContainer}>
              <ThemedText>ट्रिप शीट नम्बर: {String(tripSheetId)}</ThemedText>
            </View>
            {vehicleNumberPlateImage &&
              <Image source={{ uri: vehicleNumberPlateImage }} style={styles.uploadedImage} />
            }
            {!vehicleNumberPlateImage && (
              <TouchableOpacity
                onPress={() => vehicleNumberPlateImage === null ? openNumberPlateCamera() : null}
                style={[styles.photoButton]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  {(fueling == 'Own' || fueling == 'Attatch') && <Ionicons name="car-outline" size={20} color="white" style={{ marginRight: 5 }} />}
                  <ThemedText style={{ color: 'white' }}>
                    {(fueling == 'Own' || fueling == 'Attatch') ? 'गाड़ी के नम्बर प्लेट की' : 'सेलिंग पॉइंट की'} फ़ोटो खीचें
                  </ThemedText>
                </View>
              </TouchableOpacity>
            )}
            {fueling !== "Bulk Sale" && <View style={styles.inputContainer}>
              <ThemedText>गाड़ी नम्बर:</ThemedText>
              <TextInput
                ref={vehicleNumberInputRef}
                onPress={() => !vehicleNumberPlateImage && openNumberPlateCamera()}
                style={[styles.input, { color: colors.text }]}
                placeholder={'5678'}
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                value={vehicleNumber}
                onChangeText={(text) => {
                  setVehicleNumber(text.toUpperCase());
                  if (fueling == 'Own') {
                    if (text.length > 3) {
                      setFoundVehicles([]);
                      setNoVehicleFound(false);
                      searchVehicleByNumber(text);
                    }
                  } else {
                    // will intigrate functionality for finding party name
                    // will intigrate functionality for finding attatched vehicle
                  }
                }}
                returnKeyType="next"
                onSubmitEditing={() => driverIdInputRef.current?.focus()}
                blurOnSubmit={true}
              />
            </View>}
            {fueling == "Own" && <View style={styles.inputContainer}>
              <ThemedText>गाड़ी का मीटर:</ThemedText>
              <TextInput
                ref={odometerInputRef}
                onPress={() => !vehicleNumberPlateImage && openNumberPlateCamera()}
                style={[styles.input, { color: colors.text }]}
                placeholder={'4567835'}
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                value={odometer}
                onChangeText={(text) => { setOdodmeter(text.toUpperCase()); }}
                returnKeyType="next"
                keyboardType="number-pad"
                onSubmitEditing={() => driverIdInputRef.current?.focus()}
                blurOnSubmit={true}
              />
            </View>}
            {fueling !== "Own" && <View style={styles.inputContainer}>
              <ThemedText>{fueling == "Attatch" ? "वेंडर" : "पार्टी"} का नाम:</ThemedText>
              <TextInput
                // readOnly={fueling == "Own"}
                ref={partyNameInputRef}
                style={[styles.input, { color: colors.text }]}
                placeholder={`रिलायंक/ Flipkart`}
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                value={partyName}
                onChangeText={(text) => {
                  setPartyName(text.toUpperCase());
                }}
                returnKeyType="next"
                onSubmitEditing={() => driverIdInputRef.current?.focus()}
                blurOnSubmit={true}
              />
            </View>}
            {noVehicleFound && (
              <ThemedText style={styles.errorText}>भरे गए गाड़ी नम्बर की कोई भी ट्रिप नहीं मिली</ThemedText>
            )}
            {!noVehicleFound && fueling == 'Own' && !(vehicleNumber == "") && <TouchableOpacity
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
                        setSelectedVehicle(item.vehicleNo);
                        setVehicleNumber(item.vehicleNo);
                        handleDriverSelection(item.driverDetails?.Name || 'Unknown Driver'); // Defensive check
                        setFoundDrivers([item.driverDetails || { Name: 'Unknown Driver' }]); // Defensive check
                        setVehicleModalVisible(false);
                      }}
                    >
                      <Text style={{ color: colors.text }}>{item.vehicleNo}</Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.vehicleNo} // Fixed: Ensure key extraction matches the data model case
                />

              </View>
            </Modal>
          </View>

          <View style={styles.section}>
            {fueling == 'Own' &&
              <View style={styles.inputContainer}>
                <ThemedText>ड्राईवर की आई-डी:</ThemedText>
                <TextInput
                  ref={driverIdInputRef}
                  style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                  placeholder={`0246`}
                  placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                  value={driverId}
                  onChangeText={(text) => {
                    setDriverId(text);
                    if (fueling == 'Own') {
                      if (text.length > 3 && !(text == "")) {
                        setFoundDrivers([]);
                        setNoDriverFound(false);
                        searchDriverById(text);
                      }
                    } else {
                      // will intigrate functionality for finding and updating Manager name
                    }
                  }}
                  keyboardType="default"
                  onSubmitEditing={() => driverNameInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
            }
            {noDriverFound && (
              <ThemedText style={styles.errorText}>भरे गए आई-डी नम्बर से कोई भी ड्राईवर नहीं मिला</ThemedText>
            )}
            {fueling == 'Own' && !noDriverFound && !(driverId == "") && <TouchableOpacity
              style={[styles.pickerContainer,]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={{ color: colors.text }}>{selectedDriver || "एक ड्राईवर चुने"}</Text>
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

            <View style={styles.inputContainer}>
              <ThemedText>{fueling !== "Bulk Sale" ? "ड्राईवर" : "मेनेजर"} का नाम:</ThemedText>
              <TextInput
                ref={driverNameInputRef}
                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                placeholder="जितेन्द्र/ Jitendra"
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                value={driverName}
                onChangeText={setDriverName}
                returnKeyType="next"
                onSubmitEditing={() => driverMobileInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText>{fueling !== "Bulk Sale" ? "ड्राईवर" : "मेनेजर"} का मोबाइल नम्बर:</ThemedText>
              <TextInput
                ref={driverMobileInputRef}
                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                placeholder="1234567890"
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                keyboardType="phone-pad"
                maxLength={10}
                value={driverMobile}
                onChangeText={setDriverMobile}
                returnKeyType="next"
                onSubmitEditing={() => fuelQuantityInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.grid}>
              {fuelMeterImage &&
                fuelMeterImage.map((image, index) => (
                  <TouchableOpacity key={index} onPress={() => openModal(image)} style={styles.gridItem}>
                    <Image source={{ uri: image }} style={styles.gridImage} />
                  </TouchableOpacity>
                ))}
            </View>
            <TouchableOpacity
              onPress={() => openFuelMeterCamera()}
              style={[styles.photoButton,]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="speedometer-outline" size={20} color="white" style={{ marginRight: 5 }} />
                <ThemedText style={{ color: 'white' }}>
                  तेल मीटर/ पर्चियों की फ़ोटो खीचें
                </ThemedText>
              </View>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <ThemedText>तेल की मात्रा:</ThemedText>
              <View style={styles.rowContainer}>
                {fueling !== 'Bulk Sale' && <Picker
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
                  <Picker.Item label="फुल" value="Full" />
                  <Picker.Item label="पार्ट" value="Part" />
                </Picker>}
                <TextInput
                  onFocus={() => { if (!fuelMeterImage) { openFuelMeterCamera() } }}
                  onPress={() => !fuelMeterImage && openFuelMeterCamera()}
                  ref={fuelQuantityInputRef}
                  style={[styles.input, styles.threeQuarterInput, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                  placeholder="460.96"
                  placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                  keyboardType="numeric"
                  value={fuelQuantity.toString()}
                  onChangeText={(text) => {
                    setFuelQuantity(text);
                  }}
                  returnKeyType="next"
                  onSubmitEditing={() => adminIdInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
              <View style={styles.inputContainer}>
                <ThemedText>आर्डर कर्ता</ThemedText>
                <TextInput
                  ref={adminIdInputRef}
                  style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                  placeholder="5"
                  placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                  keyboardType="default"
                  value={adminId}
                  onChangeText={setAdminId}
                  returnKeyType="next"
                  onSubmitEditing={() => adminNameInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <TextInput
                  ref={adminNameInputRef}
                  style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C', display: 'none' }]}
                  placeholder="Enter Allocation Admin Name"
                  placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                  keyboardType="default"
                  value={adminName}
                  onChangeText={setAdminName}
                  returnKeyType="next"
                  onSubmitEditing={() => fuelQuantityInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={submitDetails}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <ThemedText style={styles.submitButtonText}>सबमिट करें</ThemedText>
              <Ionicons name="send-outline" size={20} color="white" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetForm}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <ThemedText style={[styles.resetButtonText, { color: colors.text }]}>रिसेट करें</ThemedText>
              <Ionicons name="refresh-outline" size={20} color="white" />
            </View>
          </TouchableOpacity>
        </View>
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
      {/* Modal for larger image view */}
      <Modal visible={imageModalVisible} transparent={true} onRequestClose={closeModal}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalBackground}>
            <TouchableOpacity onPress={closeModal} style={styles.imageModelcloseButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            {selectedImage !== null && (
              <Image source={{ uri: selectedImage }} style={styles.fullImage} />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    backgroundColor: 'dark',
  },
  grid: {
    width: "100%",
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 1,
  },
  gridItem: {
    width: '32%', // Slightly less than 33% to allow for some spacing
    marginBottom: 10,
  },
  gridImage: {
    width: '100%', // Make sure the image fills its container
    aspectRatio: 1,
    borderWidth: 1,
    resizeMode: 'cover',
    borderRadius: 4,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContainer: {
    width: '90%',
    height: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModelcloseButton: {
    paddingVertical: 10,
    paddingHorizontal: 150,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  fullImage: {
    width: '100%',
    height: '90%',
    resizeMode: 'contain', // Keeps aspect ratio while showing the image
  },
  navContainer: {
    paddingVertical: 10,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20
  },
  navButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    width: 90,
    alignItems: 'center',
    textAlign: 'center'
  },
  activeButton: {
    backgroundColor: '#0a7ea4',
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
    marginBottom: 0,
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
    marginVertical: 10,
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

