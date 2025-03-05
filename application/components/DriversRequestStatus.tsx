import { DriverFuelRequest } from '@/src/types';
import { baseUrl } from '@/src/utils/helpers';
import React from 'react'
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { ActivityIndicator, Button, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    requestId: string;
}

const DriversRequestStatus: React.FC<Props> = ({ requestId }) => {
    const [orderData, setOrderData] = React.useState<DriverFuelRequest | null>(null);
    const [loading, setLoading] = React.useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${baseUrl}/fuel-request/vehicle-driver/${requestId}`);
            const json = await response.json();
            setOrderData(json);
            console.log(orderData);
        } catch (error) {
            alert(error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
        console.log("Request ID: ", requestId);
    }, []);

    return (
        <>{loading && <View style={styles.loaderBg}>
            <ActivityIndicator color="#0a7ea4" />
        </View>}
            <ThemedView style={{ padding: 12, borderRadius: 6, gap: 6, paddingTop: 16 }} >
                <ThemedText style={{ textAlign: "center", fontSize: 20, fontWeight: "bold" }}>आपके डीज़ल अनुरोध की जानकारी</ThemedText>
                {orderData && !orderData.allocation && <ThemedText style={{ textAlign: "center" }}>आपका डीज़ल अनुरोध अभी पूरा नहीं हुआ है, कृपया थोड़ी देर बाद दोबारा चेक करें।</ThemedText>}
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
                                तेल मिलेगा: {orderData.allocation?.quantityType === "Full" ? "फुल" : "पार्ट"}, {orderData.allocation?.fuelQuantity > 0 ? orderData.allocation?.fuelQuantity + "लीटर" : ""}
                                </ThemedText>
                                <ThemedText>
                                {orderData.allocation?.fuelProvider} के {orderData.allocation?.pumpAllocationType === "Any" ? "किसी भी पेट्रोल पंप से" : orderData.allocation?.pumpLocation + "पेट्रोल पंप से"}
                            </ThemedText>
                            </>
                        }
                    </ThemedView>
                )}
                <Button
                    onPress={fetchData}
                    title="दोबारा चेक करें"
                    color="#0a7ea4"
                    accessibilityLabel="Refresh your fuel request status"
                />
            </ThemedView >
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
})


export default DriversRequestStatus