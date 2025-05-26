import { DriverFuelRequest } from '@/src/types';
import { baseUrl } from '@/src/utils/helpers';
import React, { useState } from 'react'
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { ActivityIndicator, Button, Linking, StyleSheet, TouchableOpacity, View, Text, Image, Modal, ScrollView, TextInput } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
const HPCL = require('@/assets/images/fuel-pumps/HPCL.jpg');
const IOCL = require('@/assets/images/fuel-pumps/IOCL.jpg');
const BPCL = require('@/assets/images/fuel-pumps/BPCL.jpg');
const Reliance = require('@/assets/images/fuel-pumps/Reliance.jpg');
type FuelProvider = 'HPCL' | 'IOCL' | 'BPCL' | 'Reliance';

const imageMap: Record<FuelProvider, any> = {
    HPCL,
    IOCL,
    BPCL,
    Reliance,
};

interface Props {
    requestId: string;
}

const DriversRequestStatus: React.FC<Props> = ({ requestId }) => {
    const [odometerModalVisible, setOdometerModalVisible] = useState(false);
    const [odometerValue, setOdometerValue] = useState('');
    const [orderData, setOrderData] = React.useState<DriverFuelRequest | null>(null);
    const [loading, setLoading] = React.useState(false);
    const { colors } = useTheme();
    const [qty, setQty] = useState("");

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${baseUrl}/fuel-request/vehicle-driver/${requestId}`);
            const json = await response.json();
            if (!response.ok) {
                throw new Error(json.message || "Failed to fetch data");
            }
            setOrderData(json);
            setQty(json?.allocation?.fuelQuantity);
            setOdometerValue(json?.odometer || '');
            console.log('allocation fulfilled: ', json?.allocation?.fulfilled);
        } catch (error) {
            alert(error);
        } finally {
            setLoading(false);
        }
    };

    const sybmitFuelStatus = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${baseUrl}/addFuelingTransaction/update-from-driver/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    odometer: odometerValue,
                    fuelQuantity: qty,
                    allocationType: orderData?.allocation?.allocationType,
                    orderId: typeof orderData?.allocation === 'object' ? orderData?.allocation?._id : undefined,
                    tripId: orderData?.tripId,
                }),
            });
            const json = await response.json();
            if (!response.ok) {
                throw new Error(json.message || "Failed to update data");
            }
            alert("Status updated successfully");
            setOdometerModalVisible(false);
            fetchData()
        } catch (error) {
            alert(error);
        } finally {
            setLoading(false);
        }
    }

    React.useEffect(() => {
        fetchData();
        console.log("Request ID: ", requestId);
    }, []);

    return (
        <>
            {loading &&
                <View style={styles.loaderBg}>
                    <ActivityIndicator color="#0a7ea4" />
                </View>
            }
            {orderData && (typeof orderData.allocation !== "string" && !orderData.allocation.fulfilled) &&
                <ThemedView style={{ padding: 12, borderRadius: 6, gap: 6, paddingTop: 16 }} >
                    <ThemedText style={{ textAlign: "center", fontSize: 20, fontWeight: "bold" }}>आपके ईंधन अनुरोध की जानकारी</ThemedText>
                    {orderData && (!orderData.allocation && !orderData.message) && <ThemedText style={{ textAlign: "center" }}>आपका ईंधन अनुरोध अभी पूरा नहीं हुआ है, कृपया थोड़ी देर बाद दोबारा चेक करें।</ThemedText>}
                    {orderData && !orderData.allocation && orderData.message && <ThemedText style={{ textAlign: "center" }}>{orderData.message}</ThemedText>}
                    {orderData && orderData.allocation?.allocationType == "bowser" && (
                        <ThemedView>
                            {orderData.allocation?.bowser.driver.location &&
                                <Link style={styles.button} href={`https://www.google.com/maps/dir/?api=1&destination=${orderData.allocation?.bowser.driver.location?.replace(' ', '')}` as any}>
                                    बाउज़र की लोकेशन देखें
                                </Link>
                            }
                            {orderData.allocation &&
                                <>
                                    <ThemedText>
                                        बाउज़र: गाड़ी नं0 {orderData.allocation?.bowser.regNo}, ड्राईवर {orderData.allocation?.bowser.driver.name}
                                    </ThemedText>
                                    <ThemedText>
                                        तेल मिलेगा: {orderData.allocation?.quantityType === "Full" ? "फुल" : "पार्ट"}, {orderData.allocation?.fuelQuantity > 0 ? orderData.allocation?.fuelQuantity + "लीटर" : ""}
                                    </ThemedText>
                                    <TouchableOpacity style={styles.button} onPress={() => Linking.openURL(`tel:${orderData.allocation?.bowser.driver.phoneNo}`)}>
                                        <ThemedText>बाउज़र ड्राईवर को काल करें</ThemedText><Ionicons name="call" size={18} color="white" />
                                    </TouchableOpacity>
                                </>
                            }
                        </ThemedView>
                    )}
                    {orderData && orderData.allocation?.allocationType == "external" && (
                        <ThemedView>
                            {orderData.allocation &&
                                <>
                                    <ThemedText>
                                        ईंधन ले लीजिये: {orderData.allocation?.quantityType === "Full" ? "फुल" : "पार्ट"}, {orderData.allocation?.fuelQuantity > 0 ? orderData.allocation?.fuelQuantity + "लीटर" : ""}
                                    </ThemedText>
                                    <ThemedText>
                                        {orderData.allocation?.fuelProvider} के {orderData.allocation?.pumpAllocationType === "Any" ? "किसी भी पेट्रोल पंप से" : orderData.allocation?.pumpLocation + "पेट्रोल पंप से"}
                                    </ThemedText>
                                    <Image
                                        source={imageMap[(orderData.allocation?.fuelProvider as FuelProvider) || 'Reliance']}
                                        style={styles.image}
                                    />
                                    <Button
                                        onPress={() => setOdometerModalVisible(true)}
                                        title="डीजल ले लिया"
                                        color="#0a7ea4"
                                        accessibilityLabel="update your fuel request status"
                                    />
                                </>
                            }
                        </ThemedView>
                    )}
                    {orderData && orderData.allocation?.allocationType == "internal" && (
                        <ThemedView>
                            {orderData.allocation &&
                                <>
                                    <ThemedText>
                                        {orderData.allocation?.bowser.driver.name} से {orderData.allocation?.quantityType === "Full" ? "फुल" : ""}, {orderData.allocation?.fuelQuantity > 0 ? orderData.allocation?.fuelQuantity + " लीटर" : ""} ईंधन ले लीजिये
                                    </ThemedText>
                                </>
                            }
                        </ThemedView>
                    )}
                    {orderData && !orderData.message && !orderData.fulfilled && <Button
                        onPress={fetchData}
                        title="दोबारा चेक करें"
                        color="#0a7ea4"
                        accessibilityLabel="Refresh your fuel request status"
                    />}
                    {
                        orderData && !orderData.message && orderData.fulfilled && (typeof orderData.allocation !== "string" && !orderData.allocation.fulfilled) && <Button
                            onPress={() => setOdometerModalVisible(true)}
                            title="ईंधन ले लिया"
                            color="#0a7ea4"
                            accessibilityLabel="Report your fuel status"
                        />
                    }
                </ThemedView >
            }
            <Modal
                animationType="fade"
                transparent={true}
                visible={odometerModalVisible}
                onRequestClose={() => {
                    setOdometerModalVisible(false);
                }}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>ईंधन लेते समय</Text>
                        </View>
                        <ScrollView style={styles.modalBody}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="किलोमीटर रीडिंग दर्ज करें"
                                placeholderTextColor={colors.text}
                                value={odometerValue}
                                onChangeText={setOdometerValue}
                                keyboardType="numeric"
                            />
                            {orderData?.allocation?.quantityType === "Full" &&
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="कितना ईंधन लिया (लीटर में) दर्ज करें"
                                    placeholderTextColor={colors.text}
                                    value={qty}
                                    onChangeText={setQty}
                                    keyboardType="numeric"
                                />
                            }
                        </ScrollView>
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setOdometerModalVisible(false)}>
                                <Text style={styles.closeButtonText}>बंद करें</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                disabled={!odometerValue}
                                style={styles.submitButton}
                                onPress={sybmitFuelStatus}
                            >
                                <Ionicons name="checkmark-outline" size={24} color="white" />
                                <Text style={styles.submitButtonText}>भेजें</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    )
}

const styles = StyleSheet.create({
    loaderBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
    },
    image: {
        marginVertical: 4,
        borderRadius: 5,
        marginHorizontal: 'auto',
        maxHeight: 250,
        width: 250,
    },
    button: {
        flexDirection: 'row',
        gap: 8,
        textAlign: 'center',
        height: 50,
        color: 'white',
        backgroundColor: '#0a7ea4',
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 26,
        marginBottom: 12,
    },
    disabledButton: {
        backgroundColor: 'gray',
    },
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
    }
})


export default DriversRequestStatus