// import { registerForPushNotificationsAsync } from '@/app/utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerIndieID } from 'native-notify';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
let isLoggedIn = false;

export const checkUserLoggedIn = async (isLoggingIn = false) => {
  try {
    const userToken = await AsyncStorage.getItem('userToken');
    const userData = await AsyncStorage.getItem('userData');
    const deviceUUID = await AsyncStorage.getItem('deviceUUID');

    if (!userToken || !deviceUUID || !userData) {
      return false;
    }

    if (isLoggingIn) {
      return true; // Skip token verification during login process
    }

    const payload = JSON.parse(atob(userToken.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds

    if (Date.now() >= expirationTime) {
      await logoutUser();
      return false;
    }

    const isOnline = await checkInternetConnection();

    if (!isOnline) {
      return true;
    }

    if (isOnline) {
      const response = await fetch('https://bowser-backend-2cdr.onrender.com/auth/verify-token', { //https://bowser-backend-2cdr.onrender.com
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: userToken, deviceUUID }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        Alert.alert('Server response error:', errorData);

        if (errorData.unauthorizedAttempt) {
          Alert.alert('Authentication Error', 'Unauthorized device attempt detected');
        }

        return false;
      }

      const data = await response.json();
      return data.valid;
    }

    return false;
  } catch (error) {
    Alert.alert('Error checking user login status:', `${error}`);
    return false;
  }
};

const checkInternetConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const loginUser = async (userId: string, password: string): Promise<void> => {
  try {
    const deviceUUID = await AsyncStorage.getItem('deviceUUID');
    const response = await fetch('https://bowser-backend-2cdr.onrender.com/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, password, deviceUUID, appName: 'Bowsers Fueling' }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    await AsyncStorage.setItem('userToken', data.token);
    await AsyncStorage.setItem('loginTime', data.loginTime);
    await AsyncStorage.setItem('userData', JSON.stringify(data.user));

    // if (data.user.pushToken) {
    //   await AsyncStorage.setItem('pushToken', data.user.pushToken);
    // } else {
    //   const newPushToken = await registerForPushNotificationsAsync();
    //   if (newPushToken) {
    //     await AsyncStorage.setItem('pushToken', newPushToken);
    //   } else {
    //     throw new Error('Failed to get new push token');
    //   }
    // }
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
};

export const signupUser = async (email: string, password: string): Promise<void> => {
  // Implement your signup logic here
  // This could involve making an API call to your backend
  console.log('Signing up with:', email, password);
  isLoggedIn = true;
};

export const logoutUser = async (): Promise<void> => {
  // Remove push token from AsyncStorage on logout
  await AsyncStorage.removeItem('pushToken');
  // Implement your logout logic here
  isLoggedIn = false;
};


async function getPushNotificationToken() {
  const { data } = await Notifications.getExpoPushTokenAsync();
  console.log("expoToken", data);  // This will be the new Expo push token
  return data;  // Return the Expo push token
}

async function getNativeNotifyExpoToken(phoneNumber: string) {
  const response = await fetch(`https://app.nativenotify.com/api/expo/indie/sub/25239/FWwj7ZcRXQi7FsC4ZHQlsi/${phoneNumber}`);
  const data = await response.json();
  console.log("Parsed Response Body:", data);

  // Check if the response contains the expo token
  const storedExpoToken = data[0]?.expo_android_token ? data[0].expo_android_token[0] : null;
  return storedExpoToken;  // Return the stored Expo token from NativeNotify
}

export async function checkAndRegisterDevice(phoneNumber: string) {
  try {
    // Step 1: Get the current device's Expo push token
    const currentExpoToken = await getPushNotificationToken();

    // Step 2: Get the Expo token already registered with NativeNotify
    const registeredExpoToken = await getNativeNotifyExpoToken(phoneNumber);

    // Step 3: Check if the tokens are different
    if (currentExpoToken !== registeredExpoToken) {
      // If tokens are different, register the device with Indie ID
      await registerIndieID(phoneNumber, 25239, 'FWwj7ZcRXQi7FsC4ZHQlsi');
      Alert.alert("Success", "Login Successful and device is ready to receive push notifications");
    } else {
      // If tokens are the same, skip registration
      Alert.alert("Device already registered", "No need to register again, Expo token is the same.");
    }
  } catch (error) {
    // Handle any errors
    Alert.alert("Errors registering push notifications", `${error instanceof Error ? error.message : error}`);
  }
}
