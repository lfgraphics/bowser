// App.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link } from 'expo-router';


const App = () => {
    const handleFuelingRedirect = () => {
        // Navigate to the /fueling page
        // Use your navigation method here, e.g., navigation.navigate('Fueling')
        console.log('Redirecting to /fueling');
    };

    const handleRequestsRedirect = () => {
        // This button is disabled for now
    };

    return (
      <View style={styles.container}>
      <Link  style={styles.button} href={'/fueling'}>
        Fueling
      </Link>
      <Link  style={styles.button} href={'/notificaions'}>
        Notifications
      </Link>
  </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'dark', // Changed background color to grey
        paddingHorizontal: 20,
    },
    button: {
        width: '100%',
        padding: 15,
        marginVertical: 10,
        backgroundColor: '#0a7ea4',
        borderRadius: 5,
        alignItems: 'center',
        textAlign:'center',
        paddingHorizontal: 20,
        color:'white'
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    disabledButton: {
      width: '100%',
      padding: 15,
      marginVertical: 10,
      backgroundColor: 'gray',
      borderRadius: 5,
      alignItems: 'center',
      paddingHorizontal: 20,
  },
});

export default App;