import { DriverFuelRequest } from '@/src/types';
import { baseUrl, blurhash } from '@/src/utils/helpers';
import React from 'react'
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
// import { Image } from 'expo-image';
import { ActivityIndicator, Button, Linking, StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
    const [orderData, setOrderData] = React.useState<DriverFuelRequest | null>(null);
    const [loading, setLoading] = React.useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${baseUrl}/fuel-request/vehicle-driver/${requestId}`);
            const json = await response.json();
            if (!response.ok) {
                throw new Error(json.message || "Failed to fetch data");
            }
            setOrderData(json);
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

    console.log('Reliance Image: ', HPCL);

    console.log("Image Data: ", imageMap[(orderData?.allocation?.fuelProvider as FuelProvider) || 'Reliance']);

    return (
        <>
            {loading &&
                <View style={styles.loaderBg}>
                    <ActivityIndicator color="#0a7ea4" />
                </View>
            }
            {orderData &&
                <ThemedView style={{ padding: 12, borderRadius: 6, gap: 6, paddingTop: 16 }} >
                    <ThemedText style={{ textAlign: "center", fontSize: 20, fontWeight: "bold" }}>आपके डीज़ल अनुरोध की जानकारी</ThemedText>
                    {orderData && (!orderData.allocation && !orderData.message) && <ThemedText style={{ textAlign: "center" }}>आपका डीज़ल अनुरोध अभी पूरा नहीं हुआ है, कृपया थोड़ी देर बाद दोबारा चेक करें।</ThemedText>}
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
                                        डीज़ल ले लीजिये: {orderData.allocation?.quantityType === "Full" ? "फुल" : "पार्ट"}, {orderData.allocation?.fuelQuantity > 0 ? orderData.allocation?.fuelQuantity + "लीटर" : ""}
                                    </ThemedText>
                                    <ThemedText>
                                        {orderData.allocation?.fuelProvider} के {orderData.allocation?.pumpAllocationType === "Any" ? "किसी भी पेट्रोल पंप से" : orderData.allocation?.pumpLocation + "पेट्रोल पंप से"}
                                    </ThemedText>
                                    <Image
                                        source={imageMap[(orderData.allocation?.fuelProvider as FuelProvider) || 'Reliance']}
                                        style={styles.image}
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
                                        {orderData.allocation?.bowser.driver.name} से {orderData.allocation?.quantityType === "Full" ? "फुल" : ""}, {orderData.allocation?.fuelQuantity > 0 ? orderData.allocation?.fuelQuantity + " लीटर" : ""} डीज़ल ले लीजिये
                                    </ThemedText>
                                </>
                            }
                        </ThemedView>
                    )}
                    {orderData && !orderData.message && <Button
                        onPress={fetchData}
                        title="दोबारा चेक करें"
                        color="#0a7ea4"
                        accessibilityLabel="Refresh your fuel request status"
                    />}
                </ThemedView >
            }
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
})


export default DriversRequestStatus