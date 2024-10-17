import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AuthScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const colorScheme = useColorScheme();
  const [isLogin, setIsLogin] = useState(true);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const userIdInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const phoneNumberInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);

  const handleAuth = async () => {
    setIsLoading(true);
    if (!validateInputs()) {
      setIsLoading(false);
      return;
    }

    try {
      let deviceUUID = await AsyncStorage.getItem('deviceUUID');

      if (!deviceUUID) {
        deviceUUID = await Crypto.randomUUID();
        await AsyncStorage.setItem('deviceUUID', deviceUUID);
      }
      const endpoint = isLogin ? 'login' : 'signup';
      const response = await fetch(`http://192.168.137.1:5000/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          password,
          deviceUUID,
          phoneNumber: isLogin ? undefined : phoneNumber,
          name: isLogin ? undefined : name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An error occurred');
      }

      console.log('Response:', data);

      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
        if (data.user) {
          await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        }
        if (data.verified) {
          router.replace('/');
        } else {
          Alert.alert("Not Verified", "Your account is not yet verified. Please contact support.");
        }
      } else {
        Alert.alert(
          "Success",
          isLogin ? "Login successful!" : "Signup successful!",
          [{ text: "OK" }],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert(
        "Authentication Error",
        (error instanceof Error ? error.message : String(error)) || (isLogin ? "Login failed. Please try again." : "Signup failed. Please try again."),
        [{ text: "OK" }],
        { cancelable: false }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateInputs = () => {
    if (!userId) {
      alert("User ID is required.");
      userIdInputRef.current?.focus();
      return false;
    }
    if (!password) {
      alert("Password is required.");
      passwordInputRef.current?.focus();
      return false;
    }
    if (!isLogin) {
      if (!phoneNumber) {
        alert("Phone number is required.");
        phoneNumberInputRef.current?.focus();
        return false;
      }
      if (!name) {
        alert("Name is required.");
        nameInputRef.current?.focus();
        return false;
      }
    }
    return true;
  };

  return (
    <View style={[styles.container, styles.main]}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.formContainer}>
          <View style={{ height: 60 }} />
          <Text style={[styles.title, { color: colors.text }]}>{isLogin ? 'Login' : 'Sign Up'}</Text>

          <View style={styles.section}>
            <View style={styles.inputContainer}>
              <Text style={{ color: colors.text }}>User ID:</Text>
              <TextInput
                ref={userIdInputRef}
                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                placeholder="Enter user ID"
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                value={userId}
                onChangeText={setUserId}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={{ color: colors.text }}>Password:</Text>
              <TextInput
                ref={passwordInputRef}
                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                placeholder="Enter password"
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                value={password}
                onChangeText={setPassword}
                // secureTextEntry
                returnKeyType={isLogin ? "done" : "next"}
                onSubmitEditing={() => isLogin ? handleAuth() : phoneNumberInputRef.current?.focus()}
                blurOnSubmit={isLogin}
              />
            </View>

            {!isLogin && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={{ color: colors.text }}>Phone Number:</Text>
                  <TextInput
                    ref={phoneNumberInputRef}
                    style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                    placeholder="Enter phone number"
                    placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    onSubmitEditing={() => nameInputRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={{ color: colors.text }}>Name:</Text>
                  <TextInput
                    ref={nameInputRef}
                    style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                    placeholder="Enter your name"
                    placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                    value={name}
                    onChangeText={setName}
                    returnKeyType="done"
                    onSubmitEditing={handleAuth}
                    blurOnSubmit={true}
                  />
                </View>
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAuth}
          >
            <Text style={styles.submitButtonText}>{isLogin ? 'Login' : 'Sign Up'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.switchButtonText}>
              {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {isLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    backgroundColor: 'dark',
  },
  container: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  formContainer: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#0a7ea4',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});