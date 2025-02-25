const WS_URL = "ws://192.168.137.1:5000";

let ws: WebSocket | null = null;

const initializeWebSocket = () => {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log("WebSocket connected for sending updates.");
    };

    ws.onclose = () => {
        console.log("WebSocket disconnected.");
        ws = null;
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
    };
};

// Call this once when your app/component mounts
initializeWebSocket();

export const sendLocationUpdate = (orderId: string, cords: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
            JSON.stringify({
                action: "update",
                orderId,
                longLat: cords,
            })
        );
        console.log(`Location sent for order ${orderId}: ${cords}`);
    } else {
        console.error("WebSocket is not connected.");
    }
};
