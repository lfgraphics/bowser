import { BASE_URL } from "@/lib/api";
import { logout } from "@/lib/auth";

export async function registerPushSubscription(mobileNumber: string, userId: string, roles: string[]): Promise<void> {
    if (!mobileNumber) {
            // Mobile number is required to register push subscription.
        return;
    }

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        alert('Notifications are temporarily unavailable: missing VAPID key configuration.');
        return;
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            // Check notification permission
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                alert('Please enable and allow notifications in your browser settings to proceed\nand login again to register to recive notifications\nThis is necessary to stay in the system');
                await logout()
                return;
            }

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                        .then(() => {
                            // Ensure ready resolves
                            navigator.serviceWorker.ready.then(() => {}).catch(() => {});
                        })
                        .catch(() => {
                            // Service Worker registration failed
                        });
            }

            // Wait for service worker registration
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            // Check if already subscribed and valid (VAPID-style endpoint)
            if (subscription && subscription.endpoint.includes('/wp/')) {
                // Already subscribed with valid VAPID endpoint
            } else {
                if (subscription) {
                    await subscription.unsubscribe();
                }

                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: (urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as unknown as BufferSource)
                });

                    // New VAPID subscription created
            }

            // Send subscription to the backend
            const response = await fetch(`${BASE_URL}/notifications/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobileNumber, userId, groups: roles, subscription, platform: "web" }),
            });

            if (!response.ok) {
                throw new Error(`Failed to register subscription: ${response.statusText}`);
            }

                await response.json();
        } catch (error) {
            alert('An error occurred while registering for notifications. Please try again.');
        }
    } else {
        alert('Push notifications are not supported in this browser. Please try a supported browser.');
    }
}

export async function unregisterPushSubscription(mobileNumber: string): Promise<{ success: boolean; error?: string }> {
    if (!mobileNumber) {
            // Mobile number is required to unregister push subscription.
        return { success: false, error: 'Mobile number is missing' };
    }

    try {
        const response = await fetch(`${BASE_URL}/notifications/unregister`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobileNumber, platform: "web" }),
        });

        if (response.ok) {
            return { success: true };
        } else {
            const errorResult = await response.json();
            return { success: false, error: errorResult.error || 'Failed to unregister' };
        }
    } catch (error) {
        return { success: false, error: 'Network or server error' };
    }
}


// Helper function to convert Base64 key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
