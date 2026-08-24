// api/send-notification.js
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined
    })
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({ error: "Missing required fields (token, title, body)" });
    }

    const messaging = getMessaging();

    await messaging.send({
      token,
      notification: { title, body },
      data: data && data.chatId ? { chatId: String(data.chatId) } : {},
      webpush: {
        fcmOptions: {
          link: data && data.chatId
            ? `https://buddy-chat-livid.vercel.app/chat/${data.chatId}`
            : "https://buddy-chat-livid.vercel.app"
        }
      }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Notification send error:", error);
    return res.status(500).json({ error: error.message });
  }
}