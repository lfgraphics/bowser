"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { Button } from "./ui/button";

/**
 * openEmbeddedCamera:
 * - Dynamically creates a React root in a <div> appended to the body.
 * - Renders a camera overlay with a <video>.
 * - Returns a Promise that resolves with the captured Base64 string or rejects if canceled.
 */
export async function openEmbeddedCamera(): Promise<string> {
    return new Promise((resolve, reject) => {
        // 1. Create a container <div> in the DOM
        const container = document.createElement("div");
        document.body.appendChild(container);

        // 2. Create a React root
        const root = ReactDOM.createRoot(container);

        // 3. A local component that handles the camera feed and resolution
        function CameraOverlay() {
            const videoRef = useRef<HTMLVideoElement>(null);
            const [stream, setStream] = useState<MediaStream | null>(null);
            const [error, setError] = useState<string | null>(null);

            useEffect(() => {
                startCamera();
                return () => {
                    stopCamera();
                };
                // eslint-disable-next-line react-hooks/exhaustive-deps
            }, []);

            async function startCamera() {
                try {
                    const userStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: { ideal: "environment" } },
                        audio: false,
                    });
                    setStream(userStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = userStream;
                    }
                } catch (err: any) {
                    setError(err?.message || "Camera access denied");
                }
            }

            function stopCamera() {
                if (stream) {
                    stream.getTracks().forEach((track) => track.stop());
                    setStream(null);
                }
            }

            function handleCapture() {
                if (!videoRef.current) return;
                const video = videoRef.current;

                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const ctx = canvas.getContext("2d");
                if (!ctx) return;

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to Base64 (JPEG @ ~70% quality)
                const base64 = canvas.toDataURL("image/jpeg", 0.7);

                cleanup();
                resolve(base64); // <-- Resolve the promise with the Base64
            }

            function handleCancel() {
                cleanup();
                reject("Camera capture canceled");
            }

            function cleanup() {
                // Stop camera
                stopCamera();
                // Unmount
                setTimeout(() => {
                    root.unmount();
                    if (container.parentNode) {
                        container.parentNode.removeChild(container);
                    }
                }, 0);
            }

            return (
                <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/70 p-4">
                    <div className="space-y-4 bg-card p-4 rounded w-full max-w-md">
                        <h2 className="font-semibold text-lg">Camera</h2>
                        {error ? (
                            <p className="text-red-600">{error}</p>
                        ) : (
                            <video
                                ref={videoRef}
                                className="bg-black w-full"
                                autoPlay
                                playsInline
                                muted
                            />
                        )}

                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="secondary"
                                onClick={handleCancel}
                                className="px-4 py-2 border rounded text-sm"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="default"
                                onClick={handleCapture}
                                disabled={!!error}
                                className="bg-blue-500 px-4 py-2 rounded text-sm text-white"
                            >
                                Capture
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        // 4. Render the overlay
        root.render(<CameraOverlay />);
    });
}
