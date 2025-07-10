// import { registerForPushNotificationsAsync } from '@/app/utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './notifications';
import { baseUrl } from './helpers';
import { router } from 'expo-router';

export const checkUserLoggedIn = async () => {
  try {
    const userToken = await AsyncStorage.getItem('userToken');
    const userData = await AsyncStorage.getItem('userData');
    const deviceUUID = await AsyncStorage.getItem('deviceUUID');

    console.log('User token:', userToken);
    console.log('User data:', userData);
    console.log('Device UUID:', deviceUUID);

    if (userData) {
      const parsedUserData = JSON.parse(userData);
      if (parsedUserData.Role.includes('Wehicle Driver')) {
        return true;
      }
    }

    if (!userToken || !deviceUUID || !userData) {
      await logoutUser();
      router.replace('/auth');
      return false;
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
      const response = await fetch(`${baseUrl}/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: userToken, deviceUUID }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.unauthorizedAttempt) {
          Alert.alert('Authentication Error', 'Unauthorized device attempt detected');
        }
        await logoutUser();
        return false;
      }

      const data = await response.json();
      return data.valid;
    }
    await logoutUser();
    return false;
  } catch (error) {
    Alert.alert('Error checking user login status:', `${error}`);
    await logoutUser();
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
};

export const logoutUser = async (): Promise<void> => {
  // Remove push token from AsyncStorage on logout
  const userData = await AsyncStorage.getItem('userData');
  if (userData) {
    const { PhoneNo } = JSON.parse(userData);
    await unregisterNativePushSubscription(PhoneNo);
  }
  await AsyncStorage.removeItem('pushToken');
  await AsyncStorage.removeItem('userData');
  router.replace('/auth');
  // Implement your logout logic here
};

async function sendTokenToBackend(phoneNumber: string) {
  try {
    const pushToken = await registerForPushNotificationsAsync();

    if (pushToken) {
      const response = await fetch(`${baseUrl}/notifications/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: phoneNumber,
          subscription: { pushToken },
          platform: 'native',
        }),
      });

      const result = await response.json();
      console.log('Token registered:', result);
    }
  } catch (error) {
    if (error instanceof Error) { console.error('Error registering push token:', error.message); }
  }
}


async function getPushNotificationToken() {
  const { data } = await Notifications.getExpoPushTokenAsync();
  return data;  // Return the Expo push token
}

async function getNativeNotifyExpoToken(phoneNumber: string) {
  const response = await fetch(`${baseUrl}/notifications/${phoneNumber}`);
  const data = await response.json();
  // Check if the response contains the expo token
  const storedExpoToken = data[0]?.expo_android_token ? data[0].expo_android_token[0] : null;
  return storedExpoToken;  // Return the stored Expo token from NativeNotify
}

export async function checkAndRegisterDevice(phoneNumber: string) {
  try {
    // Step 1: Get the current device's Expo push token
    // const currentExpoToken = await getPushNotificationToken();

    // Step 2: Get the Expo token already registered with NativeNotify
    // const registeredExpoToken = await getNativeNotifyExpoToken(phoneNumber);

    // Step 3: Check if the tokens are different
    await sendTokenToBackend(phoneNumber);
    // if (currentExpoToken !== registeredExpoToken) {
    // If tokens are different, register the device with Indie ID
    //   Alert.alert("Success", "Login Successful and device is ready to receive push notifications");
    // } else {
    // If tokens are the same, skip registration
    // Alert.alert("Device already registered", "No need to register again, Expo token is the same.");
    // }
  } catch (error) {
    // Handle any errors
    Alert.alert("Errors registering push notifications", `${error instanceof Error ? error.message : error}`);
  }
}

export async function unregisterNativePushSubscription(mobileNumber: string) {
  try {
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync();
    const response = await fetch(`${baseUrl}/notifications/unregister`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber, platform: "native", pushToken }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error unregistering native push subscription:', error);
    return { success: false, error: 'Network or server error' };
  }
}

export async function verifyTrip(tripSheetId: number): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}//tripSheet/verify-opening`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tripSheetId: tripSheetId }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify trip');
    }

    const data = await response.json();
    return data.isSetteled;
  } catch (error) {
    console.error('Error verifying trip:', error);
    throw error;
  }
}
