import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

type RootStackParamList = {
  NotificationFueling: {
    vehicleNumber: string;
    driverId: string;
    driverMobile: string;
    driverName: string;
    quantityType: "Part" | "Full";
    fuelQuantity: string;
  };
};

interface RequestDetailsProps {
  vehicleNumber: string;
  driverId: string;
  driverMobile: string[];
  driverName: string;
  quantityType: "Part" | "Full";
  fuelQuantity: string;
}

const FuelNotification = ({ vehicleNumber, driverId, driverMobile, driverName, fuelQuantity, quantityType }: RequestDetailsProps) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleGiveFuel = () => {
    if (driverMobile.length > 1) {
      // If there are more than one numbers, give an option to select a number
      Alert.alert(
        'Select a number',
        'Please select the number to call',
        [...driverMobile.map((number: string, index: number) => ({
          text: number,
          onPress: () => {
            navigation.navigate('NotificationFueling', {
              vehicleNumber,
              driverId,
              driverMobile: number,
              driverName,
              quantityType,
              fuelQuantity,
            });
          }
        })),
        { text: 'Cancel', style: 'cancel' },
        ],
      );
    } else {
      navigation.navigate('NotificationFueling', {
        vehicleNumber,
        driverId,
        driverMobile: driverMobile[0],
        driverName,
        quantityType,
        fuelQuantity,
      });
    }
  };

  const handleCallDriver = () => {
    // Make a call to the driver's phone number
    if (driverMobile.length > 1) {
      // If there are more than one numbers, give an option to select a number
      Alert.alert(
        'Select a number',
        'Please select the number to call',
        [
          ...driverMobile.map((number: string, index: number) => ({
            text: number,
            onPress: () => {
              Linking.openURL(`tel:${number}`);
            },
          })),
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    } else {
      // If there is only one number, make the call directly
      Linking.openURL(`tel:${driverMobile[0]}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.vehicleNumber}>{vehicleNumber}</Text>
      <Text style={styles.detail}>Mobile No.: {driverMobile.join(', ')}</Text>
      <Text style={styles.detail}>Fueling: {quantityType}</Text>
      {fuelQuantity && <Text style={styles.detail}>Quantity: {fuelQuantity}</Text>}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleCallDriver}>
          <Ionicons name="call" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.disabledButton]}>
          <Ionicons name="location" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleGiveFuel}>
        <MaterialIcons name="local-gas-station" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
    backgroundColor: '#11181C',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  vehicleNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#ECEDEE',
  },
  detail: {
    fontSize: 16,
    marginBottom: 4,
    color: '#ECEDEE',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#0a7ea4',
    padding: 7,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
  },
  disabledButton: {
    backgroundColor: 'gray',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
  },
  fuelNozzle: {
    width: 32,
    height: 32,
  },
});

export default FuelNotification;


