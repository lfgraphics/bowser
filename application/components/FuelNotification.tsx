import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';


interface RequestDetailsProps {
  vehicleNumber: string;
  driverId: string;
  driverMobile: string[];
  driverName: string;
  fuelQuantity: string;
}

const FuelNotification = ({ vehicleNumber, driverId, driverMobile, driverName, fuelQuantity }: RequestDetailsProps) => {
  const [selectedDriverMobile, setSelectedDriverMobile] = useState('');
  const navigation = useNavigation();

  const handleGiveFuel = () => {
    if (driverMobile.length > 1) {
      // If there are more than one numbers, give an option to select a number
      Alert.alert(
        'Select a number',
        'Please select the number to call',
        [...driverMobile.map((number: string, index: number) => ({
          text: number,
          onPress: () => {
            setSelectedDriverMobile(number);
            navigation.navigate('NotificationFueling', {
              vehicleNumber,
              driverId,
              driverMobile: number,
              driverName,
              fuelQuantity,
            })
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
              setSelectedDriverMobile(number);
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
      <Text style={styles.detail}>Driver ID: {driverId}</Text>
      <Text style={styles.detail}>Driver Phone No.: {driverMobile.join(', ')}</Text>
      <Text style={styles.detail}>Driver Name: {driverName}</Text>
      <Text style={styles.detail}>Fueling Quantity: {fuelQuantity}</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.disabledButton]}>
          <Text style={styles.buttonText}>Track</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleGiveFuel}>
          <Text style={styles.buttonText}>Give Fuel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleCallDriver}>
          <Text style={styles.buttonText}>Call Driver</Text>
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
    padding: 10,
    borderRadius: 5,
  },
  disabledButton: {
    backgroundColor: 'gray',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
  },
});

export default FuelNotification;


