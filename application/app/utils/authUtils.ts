import AsyncStorage from '@react-native-async-storage/async-storage';
// This is a placeholder implementation. Replace with your actual authentication logic.
let isLoggedIn = false;

export const checkUserLoggedIn = async () => {
  try {
    const userToken = await AsyncStorage.getItem('userToken');
    const deviceUUID = await AsyncStorage.getItem('deviceUUID');
    const loginTime = await AsyncStorage.getItem('loginTime');

    if (!userToken || !deviceUUID) {
      return false;
    }
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (loginTime && new Date(loginTime) < sevenDaysAgo) {
      await logoutUser();
      return false;
    }

    const response = await fetch('http://192.168.137.1:5000/auth/verify-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: userToken, deviceUUID }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response error:', errorText);
      return false;
    }

    const data = await response.json();
    return data.valid;
  } catch (error) {
    console.error('Error checking user login status:', error);
    return false;
  }
};

export const loginUser = async (userId: string, password: string): Promise<void> => {
  try {
    const deviceUUID = await AsyncStorage.getItem('deviceUUID');
    const response = await fetch('http://192.168.137.1:5000/auth/login', {
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
  // Implement your logout logic here
  isLoggedIn = false;
};