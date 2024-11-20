import * as React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert, StyleSheet } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { FuelNotificationProps } from '../src/types/models';
import { useState } from 'react';
import NotificationFuelingScreen from '@/app/NotificationFueling';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';

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
  bowser,
  allocationAdmin
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const [notificationFuelingVisible, setNotificationFuelingVisible] = useState<boolean>(false);

  const handleCallDriver = () => {
    if (driverMobile) {
      Linking.openURL(`tel:${driverMobile}`);
    } else {
      Alert.alert("No mobile number", "There's no mobile number available for this driver.");
    }
  };

  const handleGiveFuel = () => {
    navigation.navigate('NotificationFueling', {
      orderId,
      vehicleNumber,
      driverId,
      driverMobile,
      driverName,
      quantityType,
      quantity,
      bowser,
      allocationAdmin
    });
  };

  return (
    <>
      {notificationFuelingVisible ? (
        <NotificationFuelingScreen
          orderId={orderId}
          vehicleNumber={vehicleNumber}
          driverId={driverId}
          driverMobile={driverMobile}
          driverName={driverName}
          quantity={quantity}
          quantityType={quantityType}
          bowser={bowser}
          allocationAdmin={allocationAdmin}
          setNotificationFuelingVisible={setNotificationFuelingVisible} // Pass callback to hide screen
        />
      ) : (
        <ThemedView style={[styles.container, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.vehicleNumber, { color: colors.text }]}>{vehicleNumber}</ThemedText>
          {driverMobile && <ThemedText style={[styles.detail, { color: colors.text }]}>Mobile No.: {driverMobile}</ThemedText>}
          {driverName && <ThemedText style={[styles.detail, { color: colors.text }]}>Driver Name: {driverName}</ThemedText>}
          <ThemedText style={[styles.detail, { color: colors.text }]}>Fueling: {quantityType}</ThemedText>
          {quantity && <ThemedText style={[styles.detail, { color: colors.text }]}>Quantity: {quantity}</ThemedText>}
          <ThemedView style={styles.buttonContainer}>
            {driverMobile && (
              <TouchableOpacity style={styles.button} onPress={handleCallDriver}>
                <Ionicons name="call" size={32} color={'white'} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.button, styles.disabledButton]}>
              <Ionicons name="location" size={32} color={'white'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleGiveFuel}>
              <MaterialIcons name="local-gas-station" size={24} color={'white'} />
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
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
  },
  detail: {
    fontSize: 16,
    marginBottom: 4,
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
    textAlign: 'center',
  },
  fuelNozzle: {
    width: 32,
    height: 32,
  },
});

export default FuelNotification;
