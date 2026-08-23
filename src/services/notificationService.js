// src/services/notificationService.js
import { auth, db } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

// 🔥 Request Notification Permission
export const requestNotificationPermission = async (userId) => {
  try {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted.");
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
  }
};

// 🔥 Send Push Notification (Call after sendMessage)
export const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, title, body, data })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return null;
  }
};