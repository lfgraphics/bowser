import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { FuelNotificationProps } from '../src/types/models';

type RootStackParamList = {
  NotificationFueling: FuelNotificationProps;
};

const FuelNotification: React.FC<FuelNotificationProps> = ({
  orderId,
  vehicleNumber,
  driverId,
  driverMobile,
  driverName,
  quantity,
  quantityType,
  bowserDriver,
  allocationAdmin
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleGiveFuel = () => {
    navigation.navigate('NotificationFueling', {
      orderId,
      vehicleNumber,
      driverId,
      driverMobile,
      driverName,
      quantityType,
      quantity,
      bowserDriver,
      allocationAdmin
    });
  };

  const handleCallDriver = () => {
    if (driverMobile) {
      Linking.openURL(`tel:${driverMobile}`);
    } else {
      Alert.alert("No mobile number", "There's no mobile number available for this driver.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.vehicleNumber}>{vehicleNumber}</Text>
      {driverMobile && <Text style={styles.detail}>Mobile No.: {driverMobile}</Text>}
      {driverName && <Text style={styles.detail}>Driver Name: {driverName}</Text>}
      <Text style={styles.detail}>Fueling: {quantityType}</Text>
      {quantity && <Text style={styles.detail}>Quantity: {quantity}</Text>}
      {/* <Text style={styles.detail}>Allocated by: {allocationAdmin.userName}</Text> */}
      <View style={styles.buttonContainer}>
        {driverMobile && <TouchableOpacity style={styles.button} onPress={handleCallDriver}>
          <Ionicons name="call" size={32} color="#fff" />
        </TouchableOpacity>}
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
