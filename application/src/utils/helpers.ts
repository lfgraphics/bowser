import axios from "axios"
import * as Location from 'expo-location';
import moment from 'moment';
import { Alert } from "react-native";
import { sendLocationUpdate } from './sendLocationUpdate';
export const baseUrl = process.env.EXPO_PUBLIC_API_URL  //http://192.168.88.165:5000 //https://bowser-backend-2cdr.onrender.com

export const getAppUpdate = async () => {
    try {
        let response = await axios.get(`${baseUrl}/updates`) //http://192.168.137.1:5000
        return response.data
    } catch (error) {
        console.log(error)
    }
}

export const formatDate = (dateInput: string | Date): string => {
    const date = moment(dateInput);
    return `${date.format('DD-MM-YY')}, ${date.format('hh:mm A')}`;
};

const sharedLocations = new Set<string>(); // Track active locations
let trackingInterval: any = null;
let socket: WebSocket | null = null;

export const shareLocation = async (orderId: string) => {
    try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission Denied", "Location permission is required to request fuel.");
            return;
        }
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        const longLat = `${latitude},${longitude}`;

        sendLocationUpdate(orderId, longLat);

        // Establish WebSocket connection if not already connected
        if (!socket) {
            socket = new WebSocket("wss://bowser-backend-2cdr.onrender.com");

            socket.onopen = () => {
                console.log("WebSocket Connected");
            };

            socket.onmessage = (event) => {
                console.log("Received WebSocket Update:", event.data);
            };

            socket.onclose = () => {
                console.log("WebSocket Disconnected");
                socket = null; // Reset socket on disconnect
            };
        }

        if (!sharedLocations.has(orderId)) {
            sharedLocations.add(orderId);
            Alert.alert("Location Shared", "Your location is now being tracked.");
        }

        // Stop previous interval if exists
        if (trackingInterval) clearInterval(trackingInterval);

        // Start location updates every 30 seconds
        trackingInterval = setInterval(async () => {
            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            const longLat = `${latitude},${longitude}`;

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ orderId, longLat }));
            } else {
                console.error("WebSocket not connected. Trying to reconnect...");
                socket = null; // Reset and reconnect
                shareLocation(orderId);
            }
        }, 1000); // Update every 30 seconds

    } catch (error) {
        console.error(error);
    }
};

// Cleanup function to stop tracking (Call this on transaction submission)
export const stopSharingLocation = (orderId: string) => {
    sharedLocations.delete(orderId);
    if (sharedLocations.size === 0) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }

    if (socket) {
        socket.close(); // Close WebSocket connection
        socket = null;
    }
};

export const blurhash = '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';