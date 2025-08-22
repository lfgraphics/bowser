import * as React from "react";
import {
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  View,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { useState } from "react";
import * as Location from "expo-location";
import { ThemedText } from "@/components/ThemedText";
import { useRoute, useTheme } from "@react-navigation/native";
import { FormData, FuelingTypes, Pump } from "@/src/types/models";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { capturePhoto } from "@/src/utils/imageManipulation";
import { baseUrl } from "@/src/utils/helpers";
import { DualImagePicker } from "@/components/DualImagePicker";

interface RouteParams {
  party: string;
  odometer: string;
  tripId: string;
  category: FuelingTypes;
  orderId: string;
  vehicleNumber: string;
  driverId: string;
  driverMobile: string;
  driverName: string;
  quantityType: "Part" | "Full";
  quantity: string;
  bowser: {
    regNo: string;
    driver: {
      name: string;
      id: string;
    };
  };
  allocationAdminName: string;
  allocationAdminId: string;
}

const NotificationFuelingScreen = () => {
  const route = useRoute();
  const {
    party,
    category,
    orderId,
    vehicleNumber = "N/A",
    odometer = "0",
    tripId = "N/A",
    driverId = "N/A",
    driverMobile = "N/A",
    driverName = "N/A",
    quantityType = "N/A",
    quantity = "N/A",
    allocationAdminName,
    allocationAdminId,
  } = route.params as RouteParams;
  // declare state variables---->
  const colorScheme = useColorScheme();
  const [vehicleNumberPlateImage, setVehicleNumberPlateImage] = useState<
    string | null
  >(null);
  const [fuelMeterImage, setFuelMeterImage] = useState<string[] | null>(null);
  const [localOdometer, setOdodmeter] = useState<string>(odometer);
  const [foundPumps, setFoundPumps] = useState<Pump[] | null>(null);
  const [fuelQuantity, setFuelQuantity] = useState<string>(quantity);
  const [driverMobileNo, setDriverMobileNo] = useState(driverMobile);
  const [gpsLocation, setGpsLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [mLocation, setLocation] = useState("");
  const [fuelingDateTime, setFuelingDateTime] = useState<Date>(new Date());
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [pumpSelectVisible, setPumpSelectVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { colors } = useTheme();

  // declare refs for input fields---->
  const vehicleNumberInputRef = React.useRef<TextInput>(null);
  const driverNameInputRef = React.useRef<TextInput>(null);
  const driverIdInputRef = React.useRef<TextInput>(null);
  const partyNameInputRef = React.useRef<TextInput>(null);
  const driverMobileInputRef = React.useRef<TextInput>(null);
  const odometerInputRef = React.useRef<TextInput>(null);
  const fuelQuantityInputRef = React.useRef<TextInput>(null);
  const locationInputRef = React.useRef<TextInput>(null);
  const adminNameInputRef = React.useRef<TextInput>(null);
  const adminIdInputRef = React.useRef<TextInput>(null);

  // function declarations---->
  // startup function
  const location = async (): Promise<string | { error: string }> => {
    // Request location permissions
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return { error: "Location permission denied" };
    }

    try {
      // Attempt to get the current position
      let location: Location.LocationObject =
        await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const coordinates = `${latitude}, ${longitude}`;

      setGpsLocation(coordinates);
      return coordinates;
    } catch (error) {
      console.error("Error getting location or city:", error);
      return {
        error:
          "Unable to retrieve location. Please check your internet connection.",
      };
    }
  };
  // form submit reset
  const submitDetails = async () => {
    setFormSubmitting(true);
    if (!validateInputs()) {
      setFormSubmitting(false);
      return;
    }

    let currentGpsLocation = gpsLocation;
    const userDataString = await AsyncStorage.getItem("userData");
    const userData = userDataString ? JSON.parse(userDataString) : null;
    if (!userData) {
      Alert.alert("Error", "User data not found. Please log in again.");
      router.replace("/auth");
      return;
    }
    const locationResult = await location();

    if (typeof locationResult === "string") {
      currentGpsLocation = locationResult;
    } else if (typeof locationResult === "object" && locationResult.error) {
      Alert.alert("Location Error", locationResult.error, [{ text: "OK" }]);
    }
    let tripSheetId;

    try {
      const userDataString = await AsyncStorage.getItem("userData");
      const userData = userDataString ? JSON.parse(userDataString) : null;
      tripSheetId = userData ? userData["Trip Sheet Id"] : null;
    } catch (error) {
      console.error("Error fetching user data from AsyncStorage:", error);
    }

    if (currentGpsLocation) {
      const formData: FormData = {
        party,
        odometer: Number(localOdometer),
        tripId,
        orderId,
        category,
        vehicleNumberPlateImage,
        tripSheetId,
        vehicleNumber: vehicleNumber.toUpperCase(),
        driverName,
        driverId: driverId.toUpperCase(),
        driverMobile,
        fuelMeterImage,
        quantityType,
        fuelQuantity,
        gpsLocation: currentGpsLocation,
        location: mLocation,
        fuelingDateTime: new Date(),
        bowser: {
          regNo: userData.Bowser ? userData.Bowser : "",
          driver: {
            name: userData.Name,
            phoneNo: userData["Phone Number"],
          },
        },
        allocationAdmin: {
          name: allocationAdminName,
          id: allocationAdminId,
        },
      };

      if (isOnline) {
        try {
          const response = await fetch(`${baseUrl}/addFuelingTransaction`, {
            //https://bowser-backend-2cdr.onrender.com // http://192.168.137.1:5000
            method: "POST",
            headers: {
              "Content-Type": "application/json",
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
                text: "OK",
                onPress: () => { },
              },
            ],
            { cancelable: false }
          );
          resetForm();
          router.replace("/");
        } catch (err) {
          let errorMessage = "An unknown error occurred";

          if (err instanceof Response) {
            try {
              const errorData = await err.json();
              errorMessage =
                errorData.message || errorData.error || errorMessage;
            } catch (jsonError) { }
          } else if (err instanceof Error) {
            errorMessage = err.message;
          }

          Alert.alert(
            "Error",
            errorMessage,
            [
              {
                text: "OK",
                onPress: () => { },
              },
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
          await new Promise((resolve) => setTimeout(resolve, 10000));

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
                  const offlineData = await AsyncStorage.getItem(
                    "offlineFuelingData"
                  );
                  let offlineArray = offlineData ? JSON.parse(offlineData) : [];
                  offlineArray.push(formData);
                  await AsyncStorage.setItem(
                    "offlineFuelingData",
                    JSON.stringify(offlineArray)
                  );
                  Alert.alert(
                    "Success",
                    "Data saved offline. It will be submitted when you're back online.",
                    [{ text: "OK", onPress: () => { } }],
                    { cancelable: false }
                  );
                  resetForm();
                  router.replace("/");
                },
              },
              {
                text: "No",
                onPress: () => {
                  setFormSubmitting(false);
                },
                style: "cancel",
              },
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
  };
  const resetForm = () => {
    setVehicleNumberPlateImage(null);
    setFuelMeterImage(null);
    setFuelQuantity("0");
  };
  // form data handling
  const openNumberPlateCamera = async () => {
    if (vehicleNumberPlateImage) {
      return;
    }
    try {
      const photo = await capturePhoto();
      if (photo && photo?.length > 0) {
        setVehicleNumberPlateImage(photo);
      }
    } catch (err) {
      alert(err);
    }
  };
  const openFuelMeterCamera = async () => {
    try {
      const photo = await capturePhoto();
      if (photo && photo?.length > 0) {
        setFuelMeterImage((prevImages) =>
          prevImages ? [...prevImages, photo] : [photo]
        );
      }
    } catch (err) {
      alert(err);
    }
  };

  const serachLocation = async (locationName: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/petrol-pump/?name=${locationName}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          Alert.alert("कोई भी पंप मौजूद नहीं है", "कृपया दोबारा कोशिश करें");
          return;
        }
        throw new Error("सर्वर एरर");
      }

      const pumps: Pump[] = await response.json();
      setFoundPumps(pumps);

      if (pumps.length > 0) {
        setPumpSelectVisible(true);
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message, [{ text: "OK" }]);
      } else {
        Alert.alert("Error", "An unknown error occurred", [{ text: "OK" }]);
      }
    } finally {
      setLoading(false);
    }
  };
  // Input validation
  const validateInputs = () => {
    if (!fuelQuantity) {
      alert("Fuel Quantity is required.");
      return false;
    }
    if (!vehicleNumberPlateImage) {
      alert("Vehcicle Numebr plate image is required.");
      return false;
    }
    if (!fuelMeterImage) {
      alert("Fuel meter image is required.");
      return false;
    }
    if (!mLocation) {
      alert("Fueling location is required.");
      return false;
    }
    return true;
  };

  const openModal = (image: string) => {
    setSelectedImage(image);
    setImageModalVisible(true);
  };

  const closeModal = () => {
    setImageModalVisible(false);
    setSelectedImage(null);
  };

  return (
    <View style={[styles.container, styles.main]}>
      <ScrollView>
        <View style={styles.section}>
          <View style={[styles.navContainer, { backgroundColor: colors.card }]}>
            {(["Own", "Attatch", "Bulk Sale"] as FuelingTypes[]).map(
              (option) => (
                <TouchableOpacity
                  disabled
                  key={option}
                  style={[
                    styles.navButton,
                    option === category && styles.activeButton,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.submitButtonText,
                      {
                        color: `${category == option ? colors.card : colors.text
                          }`,
                      },
                    ]}
                  >
                    {option == "Own"
                      ? "अपना"
                      : option == "Attatch"
                        ? "अटैच"
                        : "सेल"}
                  </ThemedText>
                </TouchableOpacity>
              )
            )}
          </View>
          <ThemedText type="title">Fuel Dispensing Form</ThemedText>
          <ThemedText style={{ textAlign: "center" }}>
            {Date().toLocaleString()}
          </ThemedText>
          <View style={styles.inputContainer}>
            {vehicleNumberPlateImage && (
              <Image
                source={{ uri: vehicleNumberPlateImage }}
                style={styles.uploadedImage}
              />
            )}
            {!vehicleNumberPlateImage && (
              <DualImagePicker
                onImagePicked={(photo) => setVehicleNumberPlateImage(photo)}
                label="गाड़ी के नम्बर प्लेट की फोटो चुनें या खीचें"
              />
            )}
            {category !== "Bulk Sale" && (
              <View style={styles.inputContainer}>
                <ThemedText>गाड़ी नम्बर:</ThemedText>
                <TextInput
                  readOnly
                  ref={vehicleNumberInputRef}
                  onPress={() =>
                    !vehicleNumberPlateImage && openNumberPlateCamera()
                  }
                  style={[styles.input, { color: colors.text }]}
                  value={vehicleNumber}
                  returnKeyType="next"
                  onSubmitEditing={() => odometerInputRef.current?.focus()}
                  blurOnSubmit={true}
                />
              </View>
            )}
            {category == "Own" && (
              <View style={styles.inputContainer}>
                <ThemedText>गाड़ी का मीटर:</ThemedText>
                <TextInput
                  ref={odometerInputRef}
                  onPress={() =>
                    !vehicleNumberPlateImage && openNumberPlateCamera()
                  }
                  style={[styles.input, { color: colors.text }]}
                  value={localOdometer}
                  onChangeText={(text) => {
                    setOdodmeter(text);
                  }}
                  returnKeyType="next"
                  keyboardType="number-pad"
                  onSubmitEditing={() => driverIdInputRef.current?.focus()}
                  blurOnSubmit={true}
                />
              </View>
            )}
            {category !== "Own" && (
              <View style={styles.inputContainer}>
                <ThemedText>
                  {category == "Attatch" ? "वेंडर" : "पार्टी"} का नाम:
                </ThemedText>
                <TextInput
                  readOnly
                  ref={partyNameInputRef}
                  style={[styles.input, { color: colors.text }]}
                  value={party}
                  returnKeyType="next"
                  onSubmitEditing={() => driverIdInputRef.current?.focus()}
                  blurOnSubmit={true}
                />
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.inputContainer}>
              {category == "Own" && (
                <View style={styles.inputContainer}>
                  <ThemedText>ड्राईवर की आई-डी:</ThemedText>
                  <TextInput
                    ref={driverIdInputRef}
                    style={[
                      styles.input,
                      { color: colorScheme === "dark" ? "#ECEDEE" : "#11181C" },
                    ]}
                    value={driverId}
                    keyboardType="default"
                    onSubmitEditing={() => driverNameInputRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
              )}
            </View>
            <View style={styles.inputContainer}>
              <ThemedText>
                {category !== "Bulk Sale" ? "ड्राईवर" : "मेनेजर"} का नाम:
              </ThemedText>
              <TextInput
                readOnly
                ref={driverNameInputRef}
                style={[
                  styles.input,
                  { color: colorScheme === "dark" ? "#ECEDEE" : "#11181C" },
                ]}
                value={driverName}
                returnKeyType="next"
                onSubmitEditing={() => driverMobileInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            <View style={styles.inputContainer}>
              <ThemedText>
                {category !== "Bulk Sale" ? "ड्राईवर" : "मेनेजर"} का मोबाइल
                नम्बर:
              </ThemedText>
              <TextInput
                readOnly
                ref={driverMobileInputRef}
                style={[
                  styles.input,
                  { color: colorScheme === "dark" ? "#ECEDEE" : "#11181C" },
                ]}
                keyboardType="phone-pad"
                value={driverMobileNo}
                onChangeText={setDriverMobileNo}
                returnKeyType="next"
                onSubmitEditing={() => fuelQuantityInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.inputContainer}>
              <View style={styles.grid}>
                {fuelMeterImage &&
                  fuelMeterImage.map((image, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => openModal(image)}
                      style={styles.gridItem}
                    >
                      <Image source={{ uri: image }} style={styles.gridImage} />
                    </TouchableOpacity>
                  ))}
              </View>
              <DualImagePicker
                onImagePicked={(uri) =>
                  setFuelMeterImage((prev) => (prev ? [...prev, uri] : [uri]))
                }
                label="तेल मीटर और पर्ची की फोटो चुनें या खीचें"
              />

              <ThemedText>तेल की मात्रा:</ThemedText>
              <View style={styles.rowContainer}>
                <TextInput
                  ref={fuelQuantityInputRef}
                  readOnly
                  style={[
                    styles.input,
                    styles.quarterInput,
                    { color: colorScheme === "dark" ? "#ECEDEE" : "#11181C" },
                  ]}
                  value={quantityType == "Full" ? "फुल" : "पार्ट"}
                  returnKeyType="next"
                  onSubmitEditing={() => fuelQuantityInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <TextInput
                  ref={fuelQuantityInputRef}
                  style={[
                    styles.input,
                    styles.threeQuarterInput,
                    { color: colorScheme === "dark" ? "#ECEDEE" : "#11181C" },
                  ]}
                  keyboardType="numeric"
                  value={fuelQuantity == "0" ? "" : fuelQuantity}
                  returnKeyType="done"
                  onChangeText={(text) => {
                    setFuelQuantity(text);
                  }}
                  readOnly={false}
                  blurOnSubmit={false}
                />
              </View>
              <View style={styles.inputContainer}>
                <ThemedText>तेल देने की जगह:</ThemedText>
                <TextInput
                  ref={locationInputRef}
                  style={[styles.input, { color: colors.text }]}
                  value={mLocation}
                  onChangeText={(text) => {
                    setLocation(text);
                    if (text.length > 3) {
                      serachLocation(text);
                    }
                  }}
                  returnKeyType="next"
                  onSubmitEditing={() => adminNameInputRef.current?.focus()}
                  blurOnSubmit={true}
                />
              </View>
              <Modal
                visible={pumpSelectVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setPumpSelectVisible(false)}
              >
                <View
                  style={[
                    styles.modalContainer,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setPumpSelectVisible(false)}
                  >
                    <ThemedText style={{ color: colors.text }}>
                      Close
                    </ThemedText>
                  </TouchableOpacity>
                  <FlatList
                    data={foundPumps}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.modalItem,
                          { backgroundColor: colors.card },
                        ]}
                        onPress={() => {
                          setLocation(item.name);
                          setPumpSelectVisible(false);
                        }}
                      >
                        <ThemedText style={{ color: colors.text }}>
                          {item.name}
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.name}
                  />
                </View>
              </Modal>
              <View style={styles.inputContainer}>
                <ThemedText>आर्डर कर्ता</ThemedText>
                <TextInput
                  readOnly
                  ref={adminIdInputRef}
                  style={[
                    styles.input,
                    { color: colorScheme === "dark" ? "#ECEDEE" : "#11181C" },
                  ]}
                  keyboardType="default"
                  value={allocationAdminId}
                  returnKeyType="next"
                  onSubmitEditing={() => adminNameInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <TextInput
                  readOnly
                  ref={adminNameInputRef}
                  style={[
                    styles.input,
                    { color: colorScheme === "dark" ? "#ECEDEE" : "#11181C" },
                  ]}
                  keyboardType="default"
                  value={allocationAdminName}
                  returnKeyType="next"
                  onSubmitEditing={() => fuelQuantityInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={submitDetails}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <ThemedText style={styles.submitButtonText}>
                सबमिट करें
              </ThemedText>
              <Ionicons name="send-outline" size={20} color="white" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <ThemedText
                style={[styles.resetButtonText, { color: colors.text }]}
              >
                रिसेट करें
              </ThemedText>
              <Ionicons name="refresh-outline" size={20} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal
        visible={imageModalVisible}
        transparent={true}
        onRequestClose={closeModal}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.modalBackground}>
            <TouchableOpacity
              onPress={closeModal}
              style={styles.imageModelcloseButton}
            >
              <ThemedText style={styles.closeButtonText}>Close</ThemedText>
            </TouchableOpacity>
            {selectedImage !== null && (
              <Image source={{ uri: selectedImage }} style={styles.fullImage} />
            )}
          </View>
        </View>
      </Modal>
      {(formSubmitting || loading) && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

export default NotificationFuelingScreen;

const styles = StyleSheet.create({
  main: {
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  navContainer: {
    paddingVertical: 10,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  navButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    width: 90,
    alignItems: "center",
    textAlign: "center",
  },
  activeButton: {
    backgroundColor: "#0a7ea4",
  },
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 1,
  },
  gridItem: {
    width: "32%", // Slightly less than 33% to allow for some spacing
    marginBottom: 10,
  },
  gridImage: {
    width: "100%", // Make sure the image fills its container
    aspectRatio: 1,
    borderWidth: 1,
    resizeMode: "cover",
    borderRadius: 4,
  },
  containerTitles: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  resetButton: {
    padding: 10,
    backgroundColor: "gray",
    borderRadius: 5,
    marginBottom: 10,
  },
  resetButtonText: {
    fontWeight: "bold",
    textAlign: "center",
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
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  imageUploadContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  uploadButton: {
    backgroundColor: "#0a7ea4",
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  uploadedImage: {
    borderBlockColor: "white",
    borderWidth: 1,
    width: 350,
    minHeight: 150,
    maxHeight: 250,
    resizeMode: "contain",
    alignSelf: "center",
    borderRadius: 4,
  },
  submitButton: {
    backgroundColor: "#0a7ea4",
    padding: 16,
    borderRadius: 4,
    alignItems: "center",
    marginBottom: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  photoButton: {
    backgroundColor: "#0a7ea4",
    padding: 12,
    borderRadius: 4,
    marginVertical: 20,
    alignItems: "center",
  },
  loaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerContainer: {
    marginBottom: 8,
    textAlign: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  picker: {
    height: 50,
    width: "100%",
  },
  errorText: {
    color: "red",
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)", // Semi-transparent background
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalContainer: {
    width: "90%",
    height: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  imageModelcloseButton: {
    paddingVertical: 10,
    paddingHorizontal: 150,
    borderRadius: 5,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  fullImage: {
    width: "100%",
    height: "90%",
    resizeMode: "contain", // Keeps aspect ratio while showing the image
  },
  driverItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  closeButton: {
    padding: 10,
    alignItems: "center",
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quarterInput: {
    flex: 0.3,
    marginRight: 4,
  },
  threeQuarterInput: {
    flex: 0.7,
    marginLeft: 4,
  },
  imageSizeText: {
    textAlign: "center",
    marginTop: 4,
    fontSize: 12,
  },
  modalItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
});
