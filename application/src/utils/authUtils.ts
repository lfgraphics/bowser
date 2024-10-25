import AsyncStorage from '@react-native-async-storage/async-storage';
// This is a placeholder implementation. Replace with your actual authentication logic.
let isLoggedIn = false;

export const checkUserLoggedIn = async (isLoggingIn = false) => {
  try {
    const userToken = await AsyncStorage.getItem('userToken');
    const deviceUUID = await AsyncStorage.getItem('deviceUUID');

    if (!userToken || !deviceUUID) {
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
      console.log('Offline mode: Using saved authentication data');
      return true;
    }

    if (isOnline) {
      const response = await fetch('https://bowser-backend-2cdr.onrender.com/auth/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: userToken, deviceUUID }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server response error:', errorData);

        if (errorData.unauthorizedAttempt) {
          console.warn('Unauthorized device attempt detected');
        }

        return false;
      }

      const data = await response.json();
      return data.valid;
    }

    return false;
  } catch (error) {
    console.error('Error checking user login status:', error);
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
