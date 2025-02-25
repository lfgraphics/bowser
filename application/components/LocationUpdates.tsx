import React from "react";
import { View, Text } from "react-native";
import { useWebSocket } from "@/src/utils/useWebSocket";

interface Props {
    selectedOrderId: string;
}

const LocationUpdatesScreen: React.FC<Props> = ({ selectedOrderId }) => {
    const locationUpdates = useWebSocket(selectedOrderId);

    return (
        <View>
            {locationUpdates.map((update, index) => (
                <Text key={index}>
                    Order {update.orderId}: {update.longLat}
                </Text>
            ))}
        </View>
    );
};

export default LocationUpdatesScreen;
