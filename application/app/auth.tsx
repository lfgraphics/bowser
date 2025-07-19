import 'react-native-get-random-values';
import * as React from 'react';
import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { checkAndRegisterDevice, logoutUser } from '@/src/utils/authUtils';
import { baseUrl } from '@/src/utils/helpers';
import { AuthNav } from '@/src/types/models';

export default function AuthScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const colorScheme = useColorScheme();
  const [authNav, setAuthNav] = useState<AuthNav>('vehicleDriver');
  const [isLogin, setIsLogin] = useState(true);
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
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
        deviceUUID = Crypto.randomUUID();
        await AsyncStorage.setItem('deviceUUID', deviceUUID);
      }

      const body = JSON.stringify({
        password,
        deviceUUID,
        phoneNumber,
        name: isLogin ? undefined : name,
        appName: 'Bowsers Fueling',
        ...(await AsyncStorage.getItem('pushToken')) ? { pushToken: await AsyncStorage.getItem('pushToken') } : {},
      });

      const endpoint = isLogin ? 'login' : 'signup';

      const url = `${baseUrl}/auth${authNav == "vehicleDriver" ? "/driver" : ""}/${endpoint}${(authNav == "vehicleDriver" && endpoint == "signup") ? "-request" : ""}`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Error",
          data.message || 'An error occurred',
          [{ text: "ठीक है" }],
          { cancelable: false }
        );
        throw new Error(data.message || 'An error occurred');
      }

      if (!isLogin) {
        Alert.alert(
          "सफलतापूर्वक साइन अप हो गया।",
          data.message || 'आगे बढ़ने के लिए लॉगिन करें।',
          [{ text: "ठीक है" }],
          { cancelable: false }
        );
        setIsLogin(true);
        setIsLoading(false);
        return;
      }

      // Login process
      if (data.token) {
        try {
          await AsyncStorage.setItem('userToken', data.token);
          await AsyncStorage.setItem('isLoggedIn', 'true');
          if (data.loginTime) {
            await AsyncStorage.setItem('loginTime', data.loginTime);
          }
          if (data.user) {
            await AsyncStorage.setItem('userData', JSON.stringify(data.user));
          }
          if (authNav == "vehicleDriver") {
            if (!data.user.VehicleNo || data.user.VehicleNo == "No Vehicle Assigned") {
              Alert.alert(
                "कोई वाहन निर्धारित नहीं है",
                "कृपया डीज़ल कंट्रोल सेंटर से संपर्क करें और अपने निर्धारित वाहन को सही करें।\nलॉग आउट किया जा रहा है",
                [{ text: "ठीक है" }],
                { cancelable: false }
              );
              logoutUser();
            } else {
              Alert.alert(
                "वाहन सही है?",
                `क्या आपका निर्धारित वाहन ${data.user.VehicleNo} है?`,
                [
                  {
                    text: "हाँ",
                    onPress: async () => {
                      await checkAndRegisterDevice(phoneNumber);
                      router.replace('/');
                    }
                  },
                  {
                    text: "नहीं",
                    onPress: () => {
                      Alert.alert(
                        "ग़लत वाहन निर्धारित",
                        "कृपया डीज़ल कंट्रोल सेंटर से संपर्क करें और अपने निर्धारित वाहन को सही करें।\nलॉग आउट किया जा रहा है",
                        [{ text: "ठीक है" }],
                        { cancelable: false }
                      );
                      logoutUser();
                    }
                  }
                ],
                { cancelable: false }
              );
            }
          } else {
            await checkAndRegisterDevice(phoneNumber);
            router.replace('/');
          }
        } catch (storageError) {
          console.error('Error saving to AsyncStorage:', storageError);
          Alert.alert("स्टोरेज एरर", "डाटा सेव होने में एरर आ रहा है कृपया दोबारा कोशिश करें", [{ text: "ठीक है" }]);
        }
      } else {
        Alert.alert(
          "एरर",
          "टोकन नहीं मिला। कृपया दोबारा कोशिश करें।",
          [{ text: "ठीक है" }],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.error('Error authenticating:', error);
      Alert.alert(
        "प्रमाण नहीं हो पाया",
        (error instanceof Error ? error.message : String(error)) || (isLogin ? "लॉग इन नहीं हुआ कृप्या दोबारा कोशिश करें।" : "साइन अप नहीं हुआ कृप्या दोबारा कोशिश करें।"),
        [{ text: "ठीक है" }],
        { cancelable: false }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateInputs = () => {
    if (!password && authNav == "bowserDriver") {
      alert("पासवर्ड आवश्यक है।");
      passwordInputRef.current?.focus();
      return false;
    }
    if (!phoneNumber) {
      alert("फ़ोन नंबर आवश्यक है।");
      phoneNumberInputRef.current?.focus();
      return false;
    }
    if (!isLogin && authNav == "bowserDriver") {
      if (!name) {
        alert("नाम आवश्यक है।");
        nameInputRef.current?.focus();
        return false;
      }
    }

    // Check if Phone Number is in the format +1234567890 (optional + and 10-13 digits)
    const isValidPhoneNumber = /^\+?\d{10,13}$/; // Example: "+1234567890" is valid, "123456789" is valid, "123456" is not
    if (!isLogin && !isValidPhoneNumber.test(phoneNumber)) {
      Alert.alert(
        "कृपया सही विवरण दें",
        "अमान्य फोन नंबर। फोन नंबर 10-13 अंकों के बीच होना चाहिए।",
        [{ text: "ठीक है", onPress: () => phoneNumberInputRef.current?.focus() }],
        { cancelable: false }
      );
      return false;
    }

    // Check if Name contains only letters and spaces
    const isValidName = /^[a-zA-Z ]+$/; // Example: "John Doe" is valid, "John!Doe" is not
    if (!isLogin && !(authNav == "vehicleDriver") && !isValidName.test(name)) {
      Alert.alert(
        "कृपया सही विवरण दें",
        "नाम में केवल अक्षर और रिक्त स्थान होना चाहिए।",
        [{ text: "ठीक है", onPress: () => nameInputRef.current?.focus() }],
        { cancelable: false }
      );
      return false;
    }
    return true;
  };

  return (
    <View style={[styles.container, styles.main]}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.formContainer}>
          <View style={{ height: 60 }} />
          <Text style={[styles.title, { color: colors.text }]}>{isLogin ? 'लॉग इन' : 'साइन अप'}</Text>

          <View style={[styles.navContainer, { backgroundColor: colors.card }]}>
            {(["bowserDriver", "vehicleDriver"] as AuthNav[]).map(
              (option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.navButton,
                    authNav === option && styles.activeButton,
                  ]}
                  onPress={() => setAuthNav(option)}
                >
                  <Text
                    style={[
                      styles.submitButtonText,
                      {
                        color: `${authNav == option ? colors.card : colors.text}`,
                        textAlign: "center"
                      },
                    ]}
                  >
                    {option == "bowserDriver"
                      ? "बाउज़र ड्राइवर"
                      : "टैंकर या अन्य वाहन ड्राइवर"}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          <View style={styles.section}>
            {!isLogin && (
              <View style={styles.inputContainer}>
                <Text style={{ color: colors.text }}>{authNav == "bowserDriver" ? "नाम" : "गाड़ी नंबर"}:</Text>
                <TextInput
                  ref={nameInputRef}
                  style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                  placeholder={"अपना" + `${authNav == "bowserDriver" ? " नाम" : " गाड़ी नंबर"} दर्ज करें`}
                  placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneNumberInputRef.current?.focus()}
                  blurOnSubmit={true}
                />
              </View>
            )}
            <View style={styles.inputContainer}>
              <Text style={{ color: colors.text }}>फ़ोन नम्बर:</Text>
              <TextInput
                ref={phoneNumberInputRef}
                style={[styles.input, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                placeholder="अपना फ़ोन नम्बर दर्ज करें"
                placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {
              ((authNav == "bowserDriver") || (authNav == "vehicleDriver" && isLogin)) &&
              <View style={styles.inputContainer}>
                <Text style={{ color: colors.text }}>{isLogin ? "पासवर्ड" : "नया पासवर्ड बनाएँ"}:</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={passwordInputRef}
                    style={[styles.input, styles.passwordInput, { color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }]}
                    placeholder="पासवर्ड दर्ज करें"
                    placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType={isLogin ? "done" : "next"}
                    onSubmitEditing={() => handleAuth()}
                    blurOnSubmit={isLogin}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            }
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAuth}
          >
            <Text style={styles.submitButtonText}>{isLogin ? 'लॉग इन' : 'साइन अप'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.switchButtonText}>
              {isLogin ? 'नया अकाउंट बनाएं' : 'पुराने अकाउंट में लॉग इन करें'}
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
  navContainer: {
    paddingVertical: 10,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  navButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    width: '46%',
    alignItems: "center",
    textAlign: "center",
  },
  activeButton: {
    backgroundColor: "#0a7ea4",
    textAlign: "center",
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    padding: 10,
    position: 'absolute',
    right: 0,
  },
});
