import { FuelRequest } from '@/src/types';
import { baseUrl } from '@/src/utils/helpers';
import React from 'react'
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { ActivityIndicator, Button, Linking, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

interface Props {
    requestId: string;
}

const DriversRequestStatus: React.FC<Props> = ({ requestId }) => {
    const [orderData, setOrderData] = React.useState<FuelRequest | null>(null);
    const [loading, setLoading] = React.useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${baseUrl}/fuel-request/vehicle-driver/${requestId}`);
            const json = await response.json();
            setOrderData(json);
            console.log(json);
            console.log(requestId);
        } catch (error) {
            console.error(error);
            alert(error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    return (
        <>{loading && <ActivityIndicator color="#0a7ea4" />}
            <ThemedView style={{ padding: 10, borderRadius: 6, gap: 6 }} >
                <ThemedText style={{ textAlign: "center", fontSize: 20, fontWeight: "bold" }}>आपके ईंधन लेने के अनुरोध की जानकारी</ThemedText>
                {orderData && (
                    <ThemedView>
                        <ThemedText>
                            {orderData.fulfilled ? "स्वीकृत हो गई" : "स्वीकृत नहीं हुई है।"}
                        </ThemedText>
                        <ThemedText>
                            {orderData.allocation?.bowser.driver.location ??
                                <Link style={styles.button} href={`https://www.google.com/maps/dir/?api=1&destination=${orderData.allocation?.bowser.driver.location?.replace(' ', '')}` as any}>
                                    बाउज़र की लोकेशन देखें
                                </Link>
                            }
                        </ThemedText>
                        {orderData.allocation &&
                            <>
                                <ThemedText>
                                    बाउज़र: गाड़ी नं0{orderData.allocation.bowser.regNo}, ड्राईवर{orderData.allocation.bowser.driver.name}
                                </ThemedText>
                                <ThemedText>
                                    तेल मिलेगा: {orderData.allocation.quantityType === "Full" ? "फुल" : "पार्ट"}, {orderData.allocation.fuelQuantity > 0 ? orderData.allocation.fuelQuantity : ""}
                                </ThemedText>
                                <ThemedText>
                                    के द्वारा: {orderData.allocation.allocationAdmin.name}
                                </ThemedText>
                                <Button title="बाउज़र ड्राईवर को काल करें" onPress={() => Linking.openURL(`tel:${orderData.allocation?.bowser.driver.phoneNo}`)} color="#0a7ea4" />
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
    button: {
        flex: 1,
        marginHorizontal: 8,
        backgroundColor: '#0a7ea4',
        padding: 7,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 26,
    },
    disabledButton: {
        backgroundColor: 'gray',
    },
})


export default DriversRequestStatus