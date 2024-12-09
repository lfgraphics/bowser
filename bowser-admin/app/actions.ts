'use server'

import webpush from "web-push"

webpush.setVapidDetails(
    'mailto:itplfirebase@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
)

let subscriptions: PushSubscription[] = [] // Replace this with a database

export async function subscribeUser(sub: any) {
    // Reconstruct the subscription object
    const subscription = sub;

    subscriptions.push(subscription);
    // Save the subscription to the database in production
    // Example: await db.subscriptions.insertOne({ subscription })

    return { success: true };
}

export async function unsubscribeUser(sub: PushSubscription) {
    subscriptions = subscriptions.filter(
        (s) => JSON.stringify(s) !== JSON.stringify(sub)
    )
    // In production, remove the subscription from your database
    // Example with MongoDB:
    // await db.subscriptions.deleteOne({ subscription: sub })
    return { success: true }
}

export async function sendNotification(message: string) {
    if (subscriptions.length === 0) {
        throw new Error('No subscription available')
    }

    for (const subscription of subscriptions) {
        try {
            await webpush.sendNotification(
                subscription,
                JSON.stringify({
                    title: 'Test Notification',
                    body: message,
                    icon: '/icon-512x512.png',
                })
            )
        } catch (error) {
            console.error('Error sending push notification:', error)
        }
    }

    return { success: true }
}