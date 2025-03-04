import * as React from 'react';
import { View, TouchableOpacity, Linking, Alert, StyleSheet, ActivityIndicator, Button } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { FuelNotificationProps } from '../src/types/models';
import { Link, router } from 'expo-router';
import { ThemedText } from './ThemedText';
import { formatDate, shareLocation } from '@/src/utils/helpers';

const FuelNotification: React.FC<FuelNotificationProps> = ({
  category,
  party,
  orderId,
  vehicleNumber,
  driverId,
  driverMobile,
  driverName,
  quantity,
  quantityType,
  bowser,
  allocationAdmin,
  createdAt,
  request,
}) => {
  const [loading, setLoading] = React.useState(false)
  const { colors } = useTheme();

  const handleSareLocation = async () => {
    /*
    updates required in this funcion are:
    - have a track of shared location orderids
    - update location recursively untill the location track is there
    - clean up shared track (if found any) on submitting transaction
    - alert the driver about location is shared for the first time only, use the same function to update later
    Done - make this function usable from anywhere
    */
    setLoading(true);
    try {
      // shareLocation(orderId);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleCallDriver = () => {
    if (driverMobile) {
      Linking.openURL(`tel:${driverMobile}`);
    } else {
      Alert.alert("No mobile number", "There's no mobile number available for this driver.");
    }
  };

  const handleGiveFuel = () => {
    router.navigate(`/NotificationFueling?category=${category}&party=${party}&orderId=${orderId}&vehicleNumber=${vehicleNumber}&driverId=${driverId}&driverMobile=${driverMobile}&driverName=${driverName}&quantityType=${quantityType}&quantity=${quantity}&bowser=${bowser}&allocationAdminId=${allocationAdmin.id}&allocationAdminName=${allocationAdmin.name}`);
  };

  return (
    <>
      {loading &&
        <View style={{ width: "100%", height: "100%", opacity: 50, position: "absolute", top: 0, right: 0, zIndex: 150, backgroundColor: "black" }}>
          <ActivityIndicator size="large" color="#0000ff" style={{ position: "relative", top: "50%", }} />
        </View>
      }
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <ThemedText style={[styles.vehicleNumber, { color: colors.text }]}>{vehicleNumber}{party ? `${vehicleNumber ? ", " : ""}${party}` : ""}</ThemedText>
        {driverMobile && <ThemedText style={[styles.detail, { color: colors.text }]}>Mobile No.: {driverMobile}</ThemedText>}
        {driverName && <ThemedText style={[styles.detail, { color: colors.text }]}>Driver Name: {driverName}</ThemedText>}
        <ThemedText style={[styles.detail, { color: colors.text }]}>Fueling: {quantityType}</ThemedText>
        {quantity && <ThemedText style={[styles.detail, { color: colors.text }]}>Quantity: {quantity}</ThemedText>}
        <ThemedText>Order Time: {formatDate(createdAt)}</ThemedText>
        <View style={[{ flexDirection: "column", gap: 3, alignItems: "center" }]}>
          <View style={styles.buttonContainer}>
            {driverMobile && (
              <TouchableOpacity style={styles.button} onPress={handleCallDriver}>
                <Ionicons name="call" size={32} color={'white'} />
              </TouchableOpacity>
            )}
            {request !== null && <Link style={[styles.button, (!request.location || request.location?.length < 2) && styles.disabledButton]} disabled={!request.location || request.location?.length < 2} href={`https://www.google.com/maps/dir/?api=1&destination=${request.location?.replace(' ', '')}` as any}>
              <Ionicons name="location" size={32} color={'white'} />
            </Link>}
            <TouchableOpacity style={styles.button} onPress={handleGiveFuel}>
              <MaterialIcons name="local-gas-station" size={32} color={'white'} />
            </TouchableOpacity>
          </View>
          {/* {(request !== null && request.location?.length > 2) && <Button onPress={handleSareLocation} title='Share Location' color="#0a7ea4" />} */}
        </View>
      </View>
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
    elevation: 2,
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
