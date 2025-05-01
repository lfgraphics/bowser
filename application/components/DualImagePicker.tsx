import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    onImagePicked: (uri: string) => void;
    label: string;
}

export const DualImagePicker: React.FC<Props> = ({ onImagePicked, label }) => {
    const handleCamera = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Permission required", "Camera permission is required.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled && result.assets.length > 0) {
            onImagePicked(result.assets[0].uri);
        }
    };

    const handleGallery = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Permission required", "Gallery access is required.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled && result.assets.length > 0) {
            onImagePicked(result.assets[0].uri);
        }
    };

    return (
        <View style={styles.container}>
            {/* {image && <Image source={{ uri: image }} style={styles.image} />} */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={handleCamera} style={styles.button}>
                    <Ionicons name="camera-outline" size={20} color="white" />
                    <Text style={styles.buttonText}>
                        फ़ोटो खीचें
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleGallery} style={styles.button}>
                    <Text style={styles.buttonText}><Ionicons name="cloud-upload-outline" size={20} color="white" /> फ़ोटो अपलोड करें</Text>
                </TouchableOpacity>
            </View>
            <ThemedText style={styles.label}>{label || "Capture Photo"}</ThemedText>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginVertical: 10, alignItems: 'center' },
    image: { width: 320, height: 180, borderRadius: 6, marginBottom: 10 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
    button: {
        padding: 10,
        backgroundColor: '#0a7ea4',
        borderRadius: 6,
        minWidth: 100,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 5
    },
    buttonText: { color: '#fff' },
    label: { marginTop: 8, fontWeight: '600' },
});
