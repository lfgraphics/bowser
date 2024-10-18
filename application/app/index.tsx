import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Modal, Alert, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { checkUserLoggedIn } from '../src/utils/authUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';

const App = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const [userData, setUserData] = useState<{ name: string; userId: string } | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isGPSEnabled, setIsGPSEnabled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await syncOfflineData();
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
          for (const formData of offlineArray) {
            try {
              const response = await fetch('http://192.168.137.1:5000/formsubmit', {
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
            [{ text: "OK", onPress: () => { } }],
            { cancelable: false }
          );
        }
      } catch (error) {
        console.error('Error during offline data sync:', error);
        Alert.alert(
          "Error",
          `Failed to submit offline data.\n${error}`,
          [{ text: "OK", onPress: () => { } }],
          { cancelable: false }
        );
      }
    } else {
      Alert.alert(
        "Error",
        "Failed to submit offline data. Please connect to the internet.",
        [{ text: "OK", onPress: () => { } }],
        { cancelable: false }
      );
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

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      router.replace('/auth' as any);
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Logout Error', 'An error occurred during logout. Please try again.');
    }
  };
  const renderUserData = () => {
    if (!userData) return null;

    return Object.entries(userData).map(([key, value]) => (
      <Text key={key} style={styles.modalText}>
        {key.charAt(0).toUpperCase() + key.slice(1)}: {String(value)}
      </Text>
    ));
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
            <Text style={styles.modalTitle}>Profile</Text>
            <ScrollView style={styles.scrollView}>
              {renderUserData()}
            </ScrollView>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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
      </Modal>
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
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  scrollView: {
    maxHeight: 200,
    minWidth: 300,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  logoutButtonText: {
    color: 'white',
    marginLeft: 10,
  },
  closeButton: {
    marginTop: 20,
  },
  closeButtonText: {
    color: '#0a7ea4',
  },
  buttonText: {
    color: 'white',
  },
});

export default App;
