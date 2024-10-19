import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Modal, Alert, ScrollView, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { checkUserLoggedIn } from '../src/utils/authUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';
import { FormData } from '../src/types/models';

const App = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const [userData, setUserData] = useState<{ name: string; userId: string } | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isGPSEnabled, setIsGPSEnabled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineDataLength, setOfflineDataLength] = useState(0);
  const [offlineData, setOfflineData] = useState<FormData[]>([]);
  const [isOfflineDataModalVisible, setOfflineDataModalVisible] = useState(false);
  const [isOfflineDataLoading, setIsOfflineDataLoading] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await syncOfflineData();
        await getOfflineDataLength()
        const isLoggedIn = await checkUserLoggedIn();
        if (!isLoggedIn) {
          router.replace('/auth' as any);
        } else {
          const userDataString = await AsyncStorage.getItem('userData');
          if (userDataString) {
            setUserData(JSON.parse(userDataString));
          }
          await requestPermissions();
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        setError('An error occurred while initializing the app. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    initializeApp();
  }, []);

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  const syncOfflineData = async () => {
    if (isOnline) {
      try {
        const offlineData = await AsyncStorage.getItem('offlineFuelingData');
        if (offlineData) {
          const offlineArray = JSON.parse(offlineData);
          if (offlineArray.length > 0) {
            const userConfirmed = await new Promise((resolve) => {
              Alert.alert(
                "Sync Offline Data",
                `You have ${offlineArray.length} offline entries. Do you want to sync them now?`,
                [
                  { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
                  { text: "Sync", onPress: () => resolve(true) }
                ],
                { cancelable: false }
              );
            });

            if (userConfirmed) {
              for (const formData of offlineArray) {
                try {
                  const response = await fetch(`http://192.168.137.1:5000/formsubmit`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                  });
                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }
                } catch (err) {
                  console.error('Error syncing offline data:', err);
                }
              }
              await AsyncStorage.removeItem('offlineFuelingData');
              Alert.alert(
                "Success",
                "Offline data synced successfully.",
                [{ text: "OK" }],
                { cancelable: false }
              );
            } else {
              console.log('User cancelled offline data sync');
            }
          }
        }
      } catch (error) {
        console.error('Error during offline data sync:', error);
        Alert.alert(
          "Error",
          `Failed to submit offline data.\n${error}`,
          [{ text: "OK" }],
          { cancelable: false }
        );
      }
    }
  };

  useEffect(() => {
    if (permissionsGranted) {
      checkGPSStatus();
    }
  }, [permissionsGranted]);

  const requestPermissions = async () => {
    try {
      const [locationPermission, cameraPermission] = await Promise.all([
        Location.requestForegroundPermissionsAsync(),
        Camera.requestCameraPermissionsAsync()
      ]);

      if (locationPermission.status === 'granted' && cameraPermission.status === 'granted') {
        setPermissionsGranted(true);
        await checkGPSStatus();
      } else {
        Alert.alert(
          'Permissions Required',
          'This app requires location and camera permissions to function properly.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
    }
  };

  const checkGPSStatus = async () => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      setIsGPSEnabled(enabled);
      if (!enabled) {
        Alert.alert(
          'GPS Required',
          'Please enable GPS for this app to function properly.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.enableNetworkProviderAsync() }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking GPS status:', error);
      Alert.alert('Error', 'Failed to check GPS status. Please ensure GPS is enabled.');
    }
  };

  const handleLogout = async (isAutomatic = false) => {
    try {
      if (!isAutomatic) {
        // Ask for user confirmation
        const userConfirmed = await new Promise((resolve) => {
          Alert.alert(
            "Logout Confirmation",
            "Are you sure you want to logout?",
            [
              { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
              { text: "Logout", onPress: () => resolve(true) }
            ],
            { cancelable: false }
          );
        });

        if (!userConfirmed) return;
      }

      // Check for offline data
      const offlineData = await AsyncStorage.getItem('offlineFuelingData');
      if (offlineData) {
        const offlineArray = JSON.parse(offlineData);
        if (offlineArray.length > 0) {
          const shouldSubmit = await new Promise((resolve) => {
            Alert.alert(
              "Offline Data",
              `You have ${offlineArray.length} offline entries. Do you want to submit them before logging out?`,
              [
                { text: "No", onPress: () => resolve(false) },
                { text: "Yes", onPress: () => resolve(true) }
              ],
              { cancelable: false }
            );
          });

          if (shouldSubmit) {
            await syncOfflineData();
            // Proceed with logout after syncing
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            router.replace('/auth' as any);
          } else {
            // User chose not to submit offline data, cancel logout
            console.log('Logout cancelled: User chose not to submit offline data');
            return;
          }
        } else {
          // No offline data, proceed with normal logout
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
          router.replace('/auth' as any);
        }
      } else {
        // No offline data, proceed with normal logout
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        router.replace('/auth' as any);
      }
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Logout Error', 'An error occurred during logout. Please try again.');
    }
  };

  const getOfflineDataLength = async () => {
    try {
      setIsOfflineDataLoading(true);
      const offlineDataString = await AsyncStorage.getItem('offlineFuelingData');
      if (offlineDataString) {
        const offlineArray: FormData[] = JSON.parse(offlineDataString);
        setOfflineDataLength(offlineArray.length);
        setOfflineData(offlineArray);
      }
    } catch (error) {
      console.error('Error getting offline data length:', error);
    } finally {
      setIsOfflineDataLoading(false);
    }
  };

  const handleSubmitOfflineData = async (item: FormData, index: number) => {
    if (isOnline) {
      try {
        const response = await fetch(`http://192.168.137.1:5000/formsubmit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Remove the submitted item from offlineData
        const updatedOfflineData = offlineData.filter((_, i) => i !== index);
        setOfflineData(updatedOfflineData);
        await AsyncStorage.setItem('offlineFuelingData', JSON.stringify(updatedOfflineData));
        setOfflineDataLength(updatedOfflineData.length);
        Alert.alert("Success", "Data submitted successfully.");
      } catch (error) {
        console.error('Error submitting offline data:', error);
        Alert.alert("Error", `Failed to submit data. ${error}`);
      }
    } else {
      Alert.alert("Error", "No internet connection. Please try again when online.");
    }
  };

  const renderUserData = () => {
    if (!userData) return null;

    return (
      <View style={styles.modalBody}>
        {Object.entries(userData)
          .filter(([key]) => key !== '_id')
          .map(([key, value]) => (
            <View key={key} style={styles.dataRow}>
              <Text style={styles.dataKey}>{key.charAt(0).toUpperCase() + key.slice(1)}:</Text>
              <Text style={styles.dataValue}>{String(value)}</Text>
            </View>
          ))}
      </View>
    );
  };

  const renderOfflineData = () => {
    if (isOfflineDataLoading) {
      return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return (
      <ScrollView style={styles.modalScrollView}>
        {offlineData.map((item, index) => (
          <Accordion
            key={index}
            title={`Data ${index + 1} captured at ${item.fuelingDateTime}`}
            content={
              <View>
                {renderAccordionContent(item)}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => handleSubmitOfflineData(item, index)}
                >
                  <Text style={styles.submitButtonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            }
          />
        ))}
      </ScrollView>
    );
  };

  const renderAccordionContent = (item: FormData) => (
    <View style={styles.accordionContent}>
      {Object.entries(item).map(([key, value]) => (
        <View key={key} style={styles.dataRow}>
          <Text style={styles.dataKey}>{formatKey(key)}:</Text>
          {renderValue(key, value)}
        </View>
      ))}
    </View>
  );

  const formatKey = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const renderValue = (key: string, value: any) => {
    if (key === 'vehicleNumberPlateImage' || key === 'fuelMeterImage' || key === 'slipImage') {
      return value ? (
        <Image source={{ uri: `${value}` }} style={styles.dataImage} />
      ) : (
        <Text style={styles.dataValue}>No image</Text>
      );
    } else if (key === 'bowserDriver') {
      if (Array.isArray(value)) {
        return (
          <View>
            {value.map((driver: any, index: number) => (
              <View key={index} style={styles.bowserDriverItem}>
                <Text style={styles.dataValue}>Driver {index + 1}:</Text>
                <Text style={styles.dataValue}>ID: {driver._id}</Text>
                <Text style={styles.dataValue}>Name: {driver.userName}</Text>
                <Text style={styles.dataValue}>User ID: {driver.userId}</Text>
              </View>
            ))}
          </View>
        );
      } else if (typeof value === 'object' && value !== null) {
        // Handle case where bowserDriver is a single object
        return (
          <View style={styles.bowserDriverItem}>
            <Text style={styles.dataValue}>Driver:</Text>
            <Text style={styles.dataValue}>ID: {value._id}</Text>
            <Text style={styles.dataValue}>Name: {value.userName}</Text>
            <Text style={styles.dataValue}>User ID: {value.userId}</Text>
          </View>
        );
      } else {
        return <Text style={styles.dataValue}>No bowser driver data</Text>;
      }
    } else if (typeof value === 'object' && value !== null) {
      return <Text style={styles.dataValue}>{JSON.stringify(value)}</Text>;
    } else {
      return <Text style={styles.dataValue}>{String(value ?? 'N/A')}</Text>;
    }
  };

  if (isLoading) {
    return <View style={styles.container}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>;
  }
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!permissionsGranted || !isGPSEnabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please grant necessary permissions and enable GPS to use this app.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={checkGPSStatus}>
          <Text style={styles.buttonText}>Check GPS Status</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => setProfileModalVisible(true)}
      >
        <Ionicons name="person-circle-outline" size={32} color="#0a7ea4" />
      </TouchableOpacity>

      <Link style={styles.button} href={'/fueling'}>
        Fueling
      </Link>
      <Link style={styles.disabledButton} href={'/notifications'}>
        Pending Orders
      </Link>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isProfileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile</Text>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {renderUserData()}
              {offlineDataLength > 0 && (
                <TouchableOpacity
                  style={styles.offlineDataButton}
                  onPress={() => setOfflineDataModalVisible(true)}
                >
                  <Text style={styles.offlineDataButtonText}>
                    View Offline Data ({offlineDataLength})
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.logoutButton} onPress={() => handleLogout(false)}>
                <Ionicons name="log-out-outline" size={24} color="white" />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setProfileModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isOfflineDataModalVisible}
        onRequestClose={() => setOfflineDataModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Offline Data</Text>
            {renderOfflineData()}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setOfflineDataModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const Accordion = ({ title, content }: { title: string; content: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.accordion}>
      <TouchableOpacity style={styles.accordionHeader} onPress={() => setIsOpen(!isOpen)}>
        <Text style={styles.accordionTitle}>{title}</Text>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={24} color="#0a7ea4" />
      </TouchableOpacity>
      {isOpen && content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'dark',
    paddingHorizontal: 20,
  },
  button: {
    width: '100%',
    padding: 15,
    marginVertical: 10,
    backgroundColor: '#0a7ea4',
    borderRadius: 5,
    alignItems: 'center',
    textAlign: 'center',
    paddingHorizontal: 20,
    color: 'white'
  },
  disabledButton: {
    width: '100%',
    padding: 15,
    marginVertical: 10,
    backgroundColor: 'gray',
    borderRadius: 5,
    alignItems: 'center',
    textAlign: 'center',
    paddingHorizontal: 20,
    color: 'white'
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  profileButton: {
    position: 'absolute',
    top: 40,
    right: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    padding: 15,
  },
  modalTitle: {
    margin: 10,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalScrollView: {
    maxHeight: '70%',
  },
  modalBody: {
    padding: 15,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    padding: 15,
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dataKey: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dataValue: {
    fontSize: 16,
    color: '#666',
  },
  offlineDataButton: {
    backgroundColor: '#0a7ea4',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    margin: 10,
  },
  offlineDataButtonText: {
    color: 'white',
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
    padding: 10,
    borderRadius: 5,
  },
  logoutButtonText: {
    color: 'white',
    marginLeft: 10,
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: '#0a7ea4',
    fontSize: 16,
  },
  buttonText: {
    color: 'white',
  },
  accordion: {
    // marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  accordionContent: {
    padding: 10,
  },
  dataImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginVertical: 5,
  },
  bowserDriverItem: {
    marginLeft: 10,
    marginBottom: 5,
    borderLeftWidth: 2,
    borderLeftColor: '#0a7ea4',
    paddingLeft: 5,
  },
  submitButton: {
    backgroundColor: '#0a7ea4',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    margin: 10,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default App;
