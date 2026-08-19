// src/services/groupService.js
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "firebase/firestore";
import { db } from "../config/firebase";

// Create group
export const createGroup = async (groupName, members, ownerId, photoURL = "") => {
  try {
    const groupsRef = collection(db, "groups");
    const groupId = doc(groupsRef).id;
    await setDoc(doc(groupsRef, groupId), {
      groupId,
      name: groupName,
      photoURL: photoURL || "",
      ownerId: ownerId,
      members: [ownerId, ...members],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessage: ""
    });
    return groupId;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get user's groups
export const getUserGroups = async (userId) => {
  try {
    const q = query(collection(db, "groups"), where("members", "array-contains", userId));
    const snapshot = await getDocs(q);
    const groups = [];
    snapshot.forEach((doc) => {
      groups.push({ id: doc.id, ...doc.data() });
    });
    return groups;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get group details
export const getGroupDetails = async (groupId) => {
  try {
    const groupDoc = await getDoc(doc(db, "groups", groupId));
    if (!groupDoc.exists()) throw new Error("Group not found");
    const groupData = groupDoc.data();
    const membersData = [];
    for (const memberId of groupData.members) {
      const memberDoc = await getDoc(doc(db, "users", memberId));
      if (memberDoc.exists()) {
        membersData.push({ uid: memberId, ...memberDoc.data() });
      }
    }
    return { id: groupId, ...groupData, membersList: membersData };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Send group message
export const sendGroupMessage = async (groupId, senderId, messageData) => {
  try {
    const messagesRef = collection(db, "groups", groupId, "messages");
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
    await updateDoc(doc(db, "groups", groupId), {
      lastMessage: messageData.text || "📷 Photo",
      updatedAt: new Date()
    });
    return messageId;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Listen to group messages
export const listenToGroupMessages = (groupId, callback) => {
  try {
    const messagesRef = collection(db, "groups", groupId, "messages");
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
    console.error("Error listening to group messages:", error);
  }
};

// Add member to group
export const addMemberToGroup = async (groupId, userId) => {
  try {
    await updateDoc(doc(db, "groups", groupId), {
      members: arrayUnion(userId)
    });
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// 🔥 FIX: Remove member from group (with requesterId check)
export const removeMemberFromGroup = async (groupId, userId, requesterId) => {
  try {
    if (requesterId) {
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (!groupDoc.exists()) throw new Error("Group not found");
      const { ownerId } = groupDoc.data();
      if (requesterId !== ownerId && requesterId !== userId) {
        throw new Error("Only the group admin can remove other members");
      }
      if (userId === ownerId) {
        throw new Error("Transfer admin to someone else before removing the owner");
      }
    }
    await updateDoc(doc(db, "groups", groupId), {
      members: arrayRemove(userId)
    });
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// 🔥 FIX: Leave group (uses removeMemberFromGroup)
export const leaveGroup = async (groupId, userId) => {
  return removeMemberFromGroup(groupId, userId, userId);
};

// Update group
export const updateGroup = async (groupId, updates) => {
  try {
    await updateDoc(doc(db, "groups", groupId), {
      ...updates,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Transfer admin
export const transferGroupOwnership = async (groupId, currentOwnerId, newOwnerId) => {
  try {
    const groupRef = doc(db, "groups", groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found");
    const groupData = groupDoc.data();
    if (groupData.ownerId !== currentOwnerId) throw new Error("Only the current admin can transfer admin rights");
    if (!groupData.members.includes(newOwnerId)) throw new Error("New admin must already be a member of the group");
    await updateDoc(groupRef, { ownerId: newOwnerId, updatedAt: new Date() });
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Delete group
// Delete an entire group (only owner)
export const deleteGroup = async (groupId, requesterId) => {
  try {
    const groupRef = doc(db, "groups", groupId);
    const groupDoc = await getDoc(groupRef);

    if (!groupDoc.exists()) {
      throw new Error("Group not found");
    }

    if (groupDoc.data().ownerId !== requesterId) {
      throw new Error("Only the group admin can delete this group");
    }

    // Delete all messages in the subcollection first
    const messagesRef = collection(db, "groups", groupId, "messages");
    const messagesSnapshot = await getDocs(messagesRef);
    const deletePromises = messagesSnapshot.docs.map((msgDoc) =>
      deleteDoc(doc(db, "groups", groupId, "messages", msgDoc.id))
    );
    await Promise.all(deletePromises);

    // Then delete the group document itself
    await deleteDoc(groupRef);

    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Delete group message
export const deleteGroupMessage = async (groupId, messageId) => {
  try {
    await updateDoc(doc(db, "groups", groupId, "messages", messageId), {
      deleted: true
    });
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Mark group message as read
export const markGroupMessageAsRead = async (groupId, messageId, userId) => {
  try {
    const messageRef = doc(db, "groups", groupId, "messages", messageId);
    const messageDoc = await getDoc(messageRef);
    if (messageDoc.exists()) {
      const readBy = messageDoc.data().readBy || [];
      if (!readBy.includes(userId)) {
        await updateDoc(messageRef, { readBy: arrayUnion(userId) });
      }
    }
  } catch (error) {
    console.error("Error marking message as read:", error);
  }
};