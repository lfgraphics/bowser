import BowserDriverHome from '@/components/BowserDriverHome'
import VehicleDriverHome from '@/components/VehicleDriverHome';
import 'react-native-get-random-values';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Linking, ActivityIndicator, View } from 'react-native';
import { useNavigation } from 'expo-router';
import { checkUserLoggedIn } from '../src/utils/authUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { DriverData, UserData } from '@/src/types/models';

export default function index() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<DriverData | UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation<any>();

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Define categories for notifications with buttons
    async function setupNotificationCategories() {
      try {
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
      } catch (error) {
        console.error('Error setting up notification categories:', error);
      }
    }

    setupNotificationCategories();

    // Handle incoming notifications
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Foreground notification listener
      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received (Foreground):', notification);
      });

      // Notification interaction listener
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          const actionIdentifier = response.actionIdentifier;
          const data = response.notification.request.content.data;

          console.log('User interacted with notification:', actionIdentifier);

          // Handle button actions
          if (actionIdentifier === 'callDriver') {
            const phoneNumber = data?.driverMobile;
            if (phoneNumber) {
              Linking.openURL(`tel:${phoneNumber}`).catch(err => 
                console.error('Error opening phone dialer:', err)
              );
            }
          } else if (actionIdentifier === 'openFuelingScreen') {
            navigation.navigate('NotificationFueling', data);
            console.log(data);
          }
        } catch (error) {
          console.error('Error handling notification response:', error);
        }
      });
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }

    // Cleanup listeners
    return () => {
      try {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
        if (responseListener.current) {
          responseListener.current.remove();
        }
      } catch (error) {
        console.error('Error cleaning up notification listeners:', error);
      }
    };
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        await checkUserLoggedIn();
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          let parsedData = JSON.parse(userData);
          setUserData(parsedData);
          // Add safety check for Role array
          if (parsedData.Role && Array.isArray(parsedData.Role) && parsedData.Role.length > 0) {
            setUserRole(parsedData.Role[0]);
            console.log('User role:', parsedData.Role[0]);
          } else {
            console.warn('User role not found or invalid');
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUserRole();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <>
      {userRole === "Wehicle Driver" && <VehicleDriverHome userData={userData} />}
      {userRole === "Bowser Driver" && <BowserDriverHome />}
    </>
  )
}
