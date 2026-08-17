// src/services/chatService.js
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  updateDoc,
  arrayUnion,
  writeBatch
} from "firebase/firestore";
import { db } from "../config/firebase";

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
      type: messageData.type || "text", // "text" or "image"
      text: messageData.text || "",
      mediaURL: messageData.mediaURL || "",
      timestamp: new Date(),
      readBy: [senderId],
      deleted: false
    });

    // Update chat lastMessage
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: messageData.text || "📷 Photo",
      updatedAt: new Date()
    });

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

// Get user chats
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
        // Get other user's info
        const otherUserId = data.participants.find((id) => id !== userId);
        const { getDoc, doc } = await import("firebase/firestore");
        const otherUserDoc = await getDoc(doc(db, "users", otherUserId));
        
        chats.push({
          id: chatDoc.id,
          ...data,
          otherUser: otherUserDoc.data() || {}
        });
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
    throw new Error(error.message);
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