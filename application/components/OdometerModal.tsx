import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

interface ReusableModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (value: string) => void;
    placeholder: string;
    value: string;
    setValue: (value: string) => void;
    title: string;
    submitButtonText: string;
}

const OdometerModal: React.FC<ReusableModalProps> = ({
    visible,
    onClose,
    onSubmit,
    placeholder,
    value,
    setValue,
    title,
    submitButtonText,
}) => {
    const { colors } = useTheme();

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle,{color:colors.text}]}>{title}</Text>
                    </View>
                    <ScrollView style={styles.modalBody}>
                        <TextInput
                            style={[styles.input, { color: colors.text}]}
                            placeholder={placeholder}
                            placeholderTextColor={colors.text}
                            value={value}
                            onChangeText={setValue}
                            keyboardType="numeric"
                        />
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>बंद करें</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={!value}
                            style={styles.submitButton}
                            onPress={() => {
                                onSubmit(value);
                                onClose();
                                setValue('');
                            }}
                        >
                            <Ionicons name="checkmark-outline" size={24} color="white" />
                            <Text style={styles.submitButtonText}>{submitButtonText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default OdometerModal;

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        borderRadius: 10,
        width: '90%',
        maxHeight: '80%',
    },
    modalHeader: {
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        padding: 15,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalBody: {
        padding: 15,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        padding: 15,
    },
    closeButton: {
        padding: 10,
    },
    closeButtonText: {
        color: '#0a7ea4',
        fontSize: 16,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0a7ea4',
        padding: 10,
        borderRadius: 5,
    },
    submitButtonText: {
        color: 'white',
        marginLeft: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        marginVertical: 10,
        borderRadius: 5,
        width: '90%',
        alignSelf: 'center',
    },
});