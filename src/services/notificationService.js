// src/services/notificationService.js
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { app, db } from "../config/firebase";

const VAPID_KEY = "BEuOWFT65i33yWVEZvuGEE5wUwRU8yn2KmEmIyQgh3Q3IGqi6aIY9qaQIj8L3RzU3OCQKskhioYmQY8w_Qw6Reo";

// Ask browser permission + get FCM token + save it on the user's doc
export const requestNotificationPermission = async (userId) => {
  try {
    if (!("Notification" in window)) return null;

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (token && userId) {
      await updateDoc(doc(db, "users", userId), {
        fcmToken: token
      });
    }

    return token;
  } catch (error) {
    console.error("Error getting notification permission:", error);
    return null;
  }
};

// Listen for notifications while app is OPEN (foreground)
export const listenForForegroundMessages = (callback) => {
  try {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      callback(payload);
    });
  } catch (error) {
    console.error("Error listening for messages:", error);
  }
};

// Call this after sending a chat/group message to notify the other person
// token = the recipient's saved fcmToken (from their user doc)
export const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    if (!token) return null;

    const response = await fetch("/api/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, title, body, data })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return null;
  }
};