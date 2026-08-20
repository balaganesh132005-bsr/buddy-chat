// src/services/chatService.js - With Unread Logic
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy,
  onSnapshot,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import { db } from "../config/firebase";
import toast from "react-hot-toast";

// Notification helper
const sendDesktopNotification = (title, body, icon = "/logo192.png") => {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon,
      tag: "new-message",
      requireInteraction: true
    });
  }
};

// Get or create private chat
export const getOrCreatePrivateChat = async (user1Id, user2Id) => {
  try {
    const chatId = [user1Id, user2Id].sort().join("_");
    const chatRef = doc(db, "chats", chatId);
    const chatDoc = await getDoc(chatRef);

    if (!chatDoc.exists()) {
      await setDoc(chatRef, {
        chatId,
        type: "private",
        participants: [user1Id, user2Id],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: ""
      });
    }

    return chatId;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Send message
export const sendMessage = async (chatId, senderId, messageData) => {
  try {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const messageId = doc(messagesRef).id;

    await setDoc(doc(messagesRef, messageId), {
      messageId,
      senderId,
      type: messageData.type || "text",
      text: messageData.text || "",
      mediaURL: messageData.mediaURL || "",
      timestamp: new Date(),
      readBy: [senderId],
      deleted: false
    });

    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: messageData.text || "📷 Photo",
      updatedAt: new Date()
    });

    // 🔥 Send notification to the OTHER user
    try {
      const chatDoc = await getDoc(doc(db, "chats", chatId));
      if (chatDoc.exists()) {
        const participants = chatDoc.data().participants;
        const otherUserId = participants.find(id => id !== senderId);
        
        if (otherUserId) {
          const otherUserDoc = await getDoc(doc(db, "users", otherUserId));
          if (otherUserDoc.exists()) {
            const senderDoc = await getDoc(doc(db, "users", senderId));
            const senderName = senderDoc.exists() ? senderDoc.data().displayName : "Someone";
            
            // Send notification
            sendDesktopNotification(
              `📩 ${senderName}`,
              messageData.text || "📷 Image",
              otherUserDoc.data().photoURL || "/logo192.png"
            );
          }
        }
      }
    } catch (notifError) {
      console.error("Notification error:", notifError);
    }

    return messageId;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Listen to messages (real-time)
export const listenToMessages = (chatId, callback) => {
  try {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        if (!doc.data().deleted) {
          messages.push({ id: doc.id, ...doc.data() });
        }
      });
      callback(messages);
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error listening to messages:", error);
  }
};

// Mark message as read
export const markMessageAsRead = async (chatId, messageId, userId) => {
  try {
    const messageRef = doc(db, "chats", chatId, "messages", messageId);
    const messageDoc = await getDoc(messageRef);

    if (messageDoc.exists()) {
      const readBy = messageDoc.data().readBy || [];
      if (!readBy.includes(userId)) {
        await updateDoc(messageRef, {
          readBy: arrayUnion(userId)
        });
      }
    }
  } catch (error) {
    console.error("Error marking message as read:", error);
  }
};

// Delete message
export const deleteMessage = async (chatId, messageId) => {
  try {
    await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
      deleted: true
    });
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get user chats with unread count
export const getUserChats = async (userId) => {
  try {
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId)
    );

    const snapshot = await getDocs(q);
    const chats = [];

    for (const chatDoc of snapshot.docs) {
      const data = chatDoc.data();
      if (data.type === "private") {
        const otherUserId = data.participants.find((id) => id !== userId);
        if (otherUserId) {
          const otherUserDoc = await getDoc(doc(db, "users", otherUserId));
          if (otherUserDoc.exists()) {
            // 🔥 Calculate unread count
            const messagesRef = collection(db, "chats", chatDoc.id, "messages");
            const qMessages = query(
              messagesRef,
              where("senderId", "!=", userId),
              where("readBy", "array-contains", userId)
            );
            const messagesSnapshot = await getDocs(qMessages);
            const unreadCount = messagesSnapshot.size;

            chats.push({
              id: chatDoc.id,
              ...data,
              otherUser: otherUserDoc.data() || {},
              unreadCount: unreadCount
            });
          } else {
            console.warn("Other user document not found:", otherUserId);
          }
        }
      } else if (data.type === "group") {
        chats.push({
          id: chatDoc.id,
          ...data
        });
      }
    }

    chats.sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.() || new Date(0);
      const bTime = b.updatedAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });

    return chats;
  } catch (error) {
    console.error("Error fetching user chats:", error);
    toast.error("Chat error: " + error.message);
    return [];
  }
};

// Get unread count for chat
export const getUnreadCount = async (chatId, userId) => {
  try {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(
      messagesRef,
      where("senderId", "!=", userId),
      orderBy("senderId"),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(q);
    let unreadCount = 0;

    snapshot.forEach((doc) => {
      const readBy = doc.data().readBy || [];
      if (!readBy.includes(userId)) {
        unreadCount++;
      }
    });

    return unreadCount;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
};