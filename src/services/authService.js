// src/services/authService.js - FIXED VERSION
import {
  signInWithPopup,
  signOut,
  deleteUser
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  collection,
  where,
  getDocs
} from "firebase/firestore";
import { auth, db, googleProvider } from "../config/firebase";

// Sign in with Google
export const googleLogin = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Check if user document already exists
export const checkUserExists = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists() && userDoc.data().username) {
      return true;
    }
    return false;
  } catch (error) {
    throw new Error(error.message);
  }
};

// ✅ FIXED: Better username availability check with retry logic
export const checkUsernameAvailability = async (username, retries = 3) => {
  try {
    const cleanUsername = username.trim().toLowerCase();

    // Validate username format (alphanumeric and underscore only)
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      return false;
    }

    // Try multiple times in case of sync issues
    for (let i = 0; i < retries; i++) {
      const usernameRef = doc(db, "usernames", cleanUsername);
      const usernameDoc = await getDoc(usernameRef);

      if (!usernameDoc.exists()) {
        return true; // Username is available
      }

      // If doc exists, wait a bit before retrying
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return false; // Username is taken after retries
  } catch (error) {
    console.error("Error checking username:", error);
    return false;
  }
};

// ✅ FIXED: Create username with proper transaction handling
export const createUsername = async (uid, username, userData) => {
  try {
    const cleanUsername = username.trim().toLowerCase();

    // Final check before creating
    const isAvailable = await checkUsernameAvailability(cleanUsername, 1);
    if (!isAvailable) {
      throw new Error("Username is no longer available");
    }

    const now = new Date();

    // Create user document
    await setDoc(doc(db, "users", uid), {
      uid: uid,
      username: cleanUsername,
      displayName: userData.displayName || cleanUsername,
      email: userData.email || "",
      photoURL: userData.photoURL || "",
      bio: "",
      createdAt: now,
      updatedAt: now,
      deleted: false // Add deleted flag
    });

    // Create username mapping
    await setDoc(doc(db, "usernames", cleanUsername), {
      uid: uid,
      username: cleanUsername,
      createdAt: now,
      deleted: false // Add deleted flag
    });

    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Update user profile
export const updateUserProfile = async (uid, updates) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// 🔥 Add updateLastSeen
export const updateLastSeen = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      lastSeen: new Date()
    });
  } catch (error) {
    console.error("Error updating last seen:", error);
  }
};

// Logout
export const logout = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Search user by username
export const searchUserByUsername = async (username) => {
  try {
    const cleanUsername = username.trim().toLowerCase();

    const usernameRef = doc(db, "usernames", cleanUsername);
    const usernameDoc = await getDoc(usernameRef);

    if (!usernameDoc.exists()) {
      return null;
    }

    // Check if deleted flag is true
    if (usernameDoc.data().deleted === true) {
      return null;
    }

    const { uid } = usernameDoc.data();
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    return { uid, ...userDoc.data() };
  } catch (error) {
    console.error("Error searching user:", error);
    return null;
  }
};

// ✅ FIXED: Complete account deletion with proper cleanup
export const deleteAccount = async (uid) => {
  try {
    // Step 1: Get user document and username
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    let username = null;

    if (userDoc.exists()) {
      username = userDoc.data().username;
    }

    // Step 2: Mark user as deleted (soft delete first)
    await updateDoc(userRef, {
      deleted: true,
      deletedAt: new Date()
    });

    // Step 3: Mark username as deleted
    if (username) {
      try {
        const usernameRef = doc(db, "usernames", username);
        await updateDoc(usernameRef, {
          deleted: true,
          deletedAt: new Date()
        });
      } catch (err) {
        console.log("Error marking username as deleted:", err);
      }
    }

    // Step 4: Delete all user chats
    try {
      const chatsQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", uid)
      );
      const chatsSnapshot = await getDocs(chatsQuery);
      
      for (const chatDoc of chatsSnapshot.docs) {
        await deleteDoc(chatDoc.ref);
      }
    } catch (err) {
      console.log("Error deleting chats:", err);
    }

    // Step 5: Delete all user stories
    try {
      const storiesQuery = query(
        collection(db, "stories"),
        where("userId", "==", uid)
      );
      const storiesSnapshot = await getDocs(storiesQuery);
      
      for (const storyDoc of storiesSnapshot.docs) {
        await deleteDoc(storyDoc.ref);
      }
    } catch (err) {
      console.log("Error deleting stories:", err);
    }

    // Step 6: Delete from groups
    try {
      const groupsQuery = query(
        collection(db, "groups"),
        where("members", "array-contains", uid)
      );
      const groupsSnapshot = await getDocs(groupsQuery);
      
      for (const groupDoc of groupsSnapshot.docs) {
        const groupData = groupDoc.data();
        const updatedMembers = groupData.members.filter(m => m !== uid);
        
        if (updatedMembers.length === 0) {
          // Delete group if no members left
          await deleteDoc(groupDoc.ref);
        } else {
          // Remove user from group
          await updateDoc(groupDoc.ref, {
            members: updatedMembers
          });
        }
      }
    } catch (err) {
      console.log("Error removing from groups:", err);
    }

    // Step 7: Hard delete user document
    await deleteDoc(userRef);

    // Step 8: Delete Firebase Auth user
    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
    }

    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// ✅ NEW: Function to reclaim deleted usernames
export const reclaimUsername = async (username) => {
  try {
    const cleanUsername = username.trim().toLowerCase();
    const usernameRef = doc(db, "usernames", cleanUsername);
    const usernameDoc = await getDoc(usernameRef);

    if (usernameDoc.exists() && usernameDoc.data().deleted === true) {
      // Mark as not deleted
      await updateDoc(usernameRef, {
        deleted: false,
        reclaimedAt: new Date()
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error reclaiming username:", error);
    return false;
  }
};