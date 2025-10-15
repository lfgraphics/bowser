import { Router } from "express";
import { Types } from "mongoose";
import { findByIdAndUpdate as updateFuelingOrder } from "../models/fuelingOrders.js";
import WebSocket from "ws";
const { OPEN } = WebSocket;

export default (wss) => {
    const router = Router();
    const activeOrders = new Map(); // Stores last known locations
    const clientRooms = new Map(); // Stores which room each client is connected to

    // ✅ Handle WebSocket Connections
    wss.on("connection", (ws) => {
        console.log("Client Connected to WebSocket");

        ws.on("message", async (message) => {
            try {
                const { action, orderId, longLat } = JSON.parse(message);

                // ✅ Ensure orderId is valid
                if (!Types.ObjectId.isValid(orderId)) {
                    ws.send(JSON.stringify({ error: "Invalid Order ID format" }));
                    return;
                }
                const objectId = new Types.ObjectId(String(orderId));

                // ✅ Handle Room Joining (Receive Updates)
                if (action === "join") {
                    // If already in another room, disconnect first
                    if (clientRooms.has(ws)) {
                        const prevRoom = clientRooms.get(ws);
                        if (prevRoom !== orderId) {
                            ws.send(JSON.stringify({ message: `Leaving room ${prevRoom} and joining ${orderId}` }));
                        }
                    }

                    clientRooms.set(ws, orderId);
                    ws.send(JSON.stringify({ message: `Joined room ${orderId}` }));
                    console.log(`Client joined room: ${orderId}`);
                    return;
                }

                // ✅ Handle Room Leaving (Disconnect from Previous Room)
                if (action === "leave") {
                    if (clientRooms.has(ws)) {
                        const room = clientRooms.get(ws);
                        ws.send(JSON.stringify({ message: `Left room ${room}` }));
                        clientRooms.delete(ws);
                        console.log(`Client left room: ${room}`);
                    }
                    return;
                }

                // ✅ Handle Sending Location Updates
                if (action === "update") {
                    console.log(JSON.stringify(longLat))
                    const lastKnownLocation = activeOrders.get(orderId);
                    if (lastKnownLocation === longLat) return; // Skip if no location change

                    // Update Order Location in MongoDB
                    const fuelingOrder = await updateFuelingOrder(
                        objectId,
                        { "allocation.bowser.driver.location": longLat },
                        { new: true }
                    );
                    console.log(fuelingOrder);

                    if (!fuelingOrder) {
                        ws.send(JSON.stringify({ error: "Order not found" }));
                        return;
                    }

                    // Store Last Known Location
                    activeOrders.set(orderId, longLat);

                    // ✅ Broadcast update only to clients in the same room
                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === OPEN) {
                            if (clientRooms.get(client) === orderId) {
                                client.send(JSON.stringify({ orderId, longLat }));
                            }
                        }
                    });

                    console.log(`Location update for ${orderId}: ${longLat}`);
                }

            } catch (err) {
                console.error("Error processing WebSocket message:", err);
            }
        });

        // ✅ Cleanup on Disconnect
        ws.on("close", () => {
            console.log("Client Disconnected from WebSocket");
            clientRooms.delete(ws); // Remove from active rooms
        });
    });

    return router;
};
