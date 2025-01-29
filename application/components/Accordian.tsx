import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Accordion = ({ title, content }: { title: string; content: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <View style={styles.accordion}>
            <TouchableOpacity style={styles.accordionHeader} onPress={() => setIsOpen(!isOpen)}>
                <Text style={styles.accordionTitle}>{title}</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={24} color="#0a7ea4" />
            </TouchableOpacity>
            {isOpen && content}
        </View>
    );
};

const styles = StyleSheet.create({
    accordion: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        overflow: 'hidden',
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#f0f0f0',
    },
    accordionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0a7ea4',
    },
    accordionContent: {
        padding: 10,
    },
});

export default Accordion;