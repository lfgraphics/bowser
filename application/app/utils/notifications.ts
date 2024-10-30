import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.warn('EAS Project ID is not defined. Push notifications may not work in production.');
      }
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      })).data;
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  return token;
}

export async function registerPushTokenWithServer(userId: string, pushToken: string) {
  try {
    const apiUrl = 'https://bowser-backend-2cdr.onrender.com';
    const response = await fetch(`${apiUrl}/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, pushToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to register push token with server: ${errorText}`);
    }
  } catch (error) {
    console.error('Error registering push token with server:', error);
    throw error;
  }
}

export async function setNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('fueling', [
    {
      identifier: 'call',
      buttonTitle: 'Call',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'openScreen',
      buttonTitle: 'Open',
      options: {
        opensAppToForeground: true,
      },
    },
  ]);
}
