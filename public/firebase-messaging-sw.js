// public/firebase-messaging-sw.js
// This file MUST be in the public folder, and MUST be named exactly this.
// It runs in the background so notifications work even when the tab is closed.

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDo_lLsQ2fdtJzmVHsS1NLznfRqecxHAd8",
  authDomain: "socialchat13.firebaseapp.com",
  projectId: "socialchat13",
  storageBucket: "socialchat13.firebasestorage.app",
  messagingSenderId: "218944431131",
  appId: "1:218944431131:web:bc37680c50ef795dfb04be"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "BuddyChat", {
    body: body || "New message",
    icon: "/logo192.png"
  });
});