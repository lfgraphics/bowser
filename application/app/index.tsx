import BowserDriverHome from '@/components/BowserDriverHome'
import VehicleDriverHome from '@/components/VehicleDriverHome';
import 'react-native-get-random-values';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from 'expo-router';
import { checkUserLoggedIn } from '../src/utils/authUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { DriverData, UserData } from '@/src/types/models';

export default function index() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<DriverData | UserData | null>(null);
  const navigation = useNavigation<any>();

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Define categories for notifications with buttons
    async function setupNotificationCategories() {
      await Notifications.setNotificationCategoryAsync('fuelingActions', [
        {
          identifier: 'callDriver',
          buttonTitle: 'Call Driver',
          options: { isDestructive: false, opensAppToForeground: true },
        },
        {
          identifier: 'openFuelingScreen',
          buttonTitle: 'Fuel',
          options: { opensAppToForeground: true },
        },
      ]);
    }

    setupNotificationCategories();

    // Handle incoming notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Foreground notification listener
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received (Foreground):', notification);
    });

    // Notification interaction listener
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionIdentifier = response.actionIdentifier;
      const data = response.notification.request.content.data;

      console.log('User interacted with notification:', actionIdentifier,);

      // Handle button actions
      if (actionIdentifier === 'callDriver') {
        const phoneNumber = data.driverMobile;
        Linking.openURL(`tel:${phoneNumber}`);
      } else if (actionIdentifier === 'openFuelingScreen') {
        navigation.navigate('NotificationFueling', data);
        console.log(data)
      }
    });

    // Cleanup listeners
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      await checkUserLoggedIn();
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          let parsedData = JSON.parse(userData);
          setUserData(parsedData);
          setUserRole(parsedData.Role[0]);
          console.log(parsedData.Role[0])
        }
      } catch (error) {
        console.log(error);
      }
    }
    fetchUserRole();
  }, []);

  return (
    <>
      {userRole === "Wehicle Driver" && <VehicleDriverHome userData={userData} />}
      {userRole === "Bowser Driver" && <BowserDriverHome />}
    </>
  )
}
