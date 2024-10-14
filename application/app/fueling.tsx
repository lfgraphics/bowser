import { Image, StyleSheet, Platform, Text, TextInput, TouchableOpacity, useColorScheme, ScrollView, View, ActivityIndicator, Button } from 'react-native';
import React, { useState, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
// import VisionCameraOcr from 'vision-camera-ocr'; // Import the OCR library
// import { scanOCR } from 'vision-camera-ocr';

export default function FuelingScreen() {
  // declare state variables---->
  const colorScheme = useColorScheme();
  const [vehicleNumberPlateImage, setVehicleNumberPlateImage] = useState<string | null>(null);
  const [fuelMeterImage, setFuelMeterImage] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverId, setDriverId] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [fuelQuantity, setFuelQuantity] = useState('');
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

    // if (!validateInputs()) {
    //   return;
    // }

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
      // console.log({
      //   vehicleNumberPlateImage,
      //   vehicleNumber,
      //   driverName,
      //   driverId,
      //   driverMobile,
      //   fuelMeterImage,
      //   fuelQuantity,
      //   gpsLocation: currentGpsLocation,
      //   fuelingDateTime: currentFuelingDateTime
      // });
      const formData = JSON.stringify({
        vehicleNumberPlateImage,
        vehicleNumber,
        driverName,
        driverId,
        driverMobile,
        fuelMeterImage,
        fuelQuantity,
        gpsLocation,
        fuelingDateTime
      });

      // if (vehicleNumberPlateImage) {
      //   formData.append('vehicleNumberPlateImage', vehicleNumberPlateImage);
      // }
      // formData.append('vehicleNumber', vehicleNumber);
      // formData.append('driverName', driverName);
      // formData.append('driverId', driverId);
      // formData.append('driverMobile', driverMobile);
      // if (fuelMeterImage) {
      //   formData.append('fuelMeterImage', fuelMeterImage);
      // }
      // formData.append('fuelQuantity', fuelQuantity);
      // formData.append('gpsLocaion', currentGpsLocation);
      // formData.append('fuelingDate&Time', currentFuelingDateTime);

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

        const responseText = await response.text(); // or response.json() if the response is JSON
        console.log('Response:', responseText); // Log the response 
        alert(responseText)
      } catch (err) {
        console.error('Fetch error:', err); // Log any fetch errors
      }
    }
  }
  const resetForm = () => {
    setVehicleNumberPlateImage(null);
    setFuelMeterImage(null);
    setVehicleNumber('');
    setDriverName('');
    setDriverId('');
    setDriverMobile('');
    setFuelQuantity('');
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

      // Convert the image to a base64 string
      // const base64Image = await imageToBase64(imageUri);

      // // Send the base64 image to the server for processing
      // try {
      //   const response = await fetch('http://192.168.137.1:5000/imageprocessing', {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({ image: base64Image }), // Wrap in an object
      //   });

      //   if (!response.ok) {
      //     throw new Error(`HTTP error! status: ${response.status}`);
      //   }

      //   // if (response.body) {
      //   //   const reader = response.body.getReader();
      //   //   const decoder = new TextDecoder("utf-8");
      //   //   let result = '';

      //   //   while (true) {
      //   //     const { done, value } = await reader.read();
      //   //     if (done) break;

      //   //     result += decoder.decode(value, { stream: true });
      //   //     const messages = result.split('\n').filter(Boolean); // Split messages by new line

      //   //     messages.forEach(message => {
      //   //       const data = JSON.parse(message);
      //   //       if (data.progress) {
      //   //         console.log('Progress:', data.progress);
      //   //       }
      //   //       if (data.text) {
      //   //         console.log('Processed Text:', data.text);
      //   //       }
      //   //     });
      //   //   }
      //   // } else {
      //   //   // Handle the case where response.body is null
      //   //   console.error("Response body is null");
      //   // }


      //   const text = response.text.toString();
      //   console.log('Server response:', text);

      //   console.log('Image processing result:', text);
      //   setVehicleNumber(text)
      // } catch (error) {
      //   console.error('Error processing image:', error);
      //   if (error instanceof Error) {
      //     alert(`Error processing image: ${error.message}`);
      //   } else {
      //     alert('An unknown error occurred while processing the image');
      //   }
      // }
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

      // Send the image to the server for processing
      // try {
      //   const response = await fetch('http://192.168.137.1:5000/imageprocessing', {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({ image: base64Image }), // Wrap in an object
      //   });

      //   if (!response.ok) {
      //     throw new Error(`HTTP error! status: ${response.status}`);
      //   }

      //   const text = response.text.toString();
      //   console.log('Server response:', text);

      //   // Only try to parse as JSON if it's actually JSON
      //   console.log('Image processing result:', text);
      //   setFuelQuantity(text)
      // } catch (error) {
      //   console.error('Error processing image:', error);
      //   if (error instanceof Error) {
      //     alert(`Error processing image: ${error.message}`);
      //   } else {
      //     alert('An unknown error occurred while processing the image');
      //   }
      // }
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
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollViewContent}>
        <ThemedView style={styles.formContainer}>
          <View style={{ height: 60 }} />
          <ThemedText type="title">Fuel Dispensing Form</ThemedText>

          <ThemedView style={styles.section}>
            <ThemedText style={{ textAlign: 'center' }}>{Date().toLocaleString()}</ThemedText>
          </ThemedView>

          <ThemedView style={styles.section}>

            {vehicleNumberPlateImage && (
              <Image source={{ uri: vehicleNumberPlateImage }} style={styles.uploadedImage} />
            )}
            <ThemedView style={styles.inputContainer}>
              <ThemedText>Vehicle Number:</ThemedText>
              <TextInput
                ref={vehicleNumberInputRef}
                onPress={() => vehicleNumber === '' ? openNumberPlateCamera() : null}
                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                placeholder="Enter vehicle number"
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
                returnKeyType="next"
                onSubmitEditing={() => driverNameInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </ThemedView>
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
                onChangeText={setDriverId}
                keyboardType="phone-pad"
                // returnKeyType="next"
                onSubmitEditing={() => driverMobileInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </ThemedView>
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
                onSubmitEditing={() => driverIdInputRef.current?.focus()}
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
              <Image source={{ uri: fuelMeterImage }} style={styles.uploadedImage} />
            )}
            <ThemedView style={styles.inputContainer}>
              <ThemedText>Fuel Quantity Dispensed:</ThemedText>
              <TextInput
                onPress={() => fuelQuantity === '' ? openFuelMeterCamera() : null}
                ref={fuelQuantityInputRef}
                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                placeholder="Enter fuel quantity"
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                keyboardType="numeric"
                value={fuelQuantity}
                onChangeText={setFuelQuantity}
                returnKeyType="next"
                onSubmitEditing={() => gpsLocationInputRef.current?.focus()}
                blurOnSubmit={false}
              />
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
    height: 250,
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
});
