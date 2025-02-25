import { AndroidImportance } from "expo-notifications";
import { useEffect, useRef, useState } from "react";

interface LocationUpdate {
    orderId: string;
    longLat: string;
}

interface ServerMessage {
    message?: string;
    error?: string;
    orderId?: string;
    longLat?: string;
}

const WS_URL = "ws://192.168.137.1:5000";

export const useWebSocket = (orderId: string | null) => {
    const [locationUpdates, setLocationUpdates] = useState<LocationUpdate[]>([]);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!orderId) return;

        ws.current = new WebSocket(WS_URL);

        ws.current.onopen = () => {
            console.log(`Connected to WebSocket, joining room: ${orderId}`);
            ws.current?.send(JSON.stringify({ action: "join", orderId }));
        };

        ws.current.onmessage = (event) => {
            try {
                const data: ServerMessage = JSON.parse(event.data);
                console.log("Received WebSocket message:", data);

                if (data.orderId && data.longLat) {
                    setLocationUpdates((prev) => [...prev, { orderId: data.orderId!, longLat: data.longLat! }]);
                } else if (data.message) {
                    console.log(data.message);
                } else if (data.error) {
                    console.error("WebSocket error from server:", data.error);
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };

        ws.current.onclose = () => {
            console.log("Disconnected from WebSocket");
        };

        return () => {
            ws.current?.send(JSON.stringify({ action: "leave", orderId }));
            ws.current?.close();
            ws.current = null;
        };
    }, [orderId]);

    return locationUpdates;
};
