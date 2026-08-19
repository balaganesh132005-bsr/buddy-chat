// src/services/authService.js - Clean
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
  deleteDoc
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

// Check if a username is available
export const checkUsernameAvailability = async (username) => {
  try {
    const cleanUsername = username.trim().toLowerCase();

    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return false;
    }

    const usernameRef = doc(db, "usernames", cleanUsername);
    const usernameDoc = await getDoc(usernameRef);

    return !usernameDoc.exists();
  } catch (error) {
    console.error("Error checking username:", error);
    return false;
  }
};

// Create username + user profile
export const createUsername = async (uid, username, userData) => {
  try {
    const cleanUsername = username.trim().toLowerCase();

    const isAvailable = await checkUsernameAvailability(cleanUsername);
    if (!isAvailable) {
      throw new Error("Username is no longer available");
    }

    const now = new Date();

    await setDoc(doc(db, "users", uid), {
      uid: uid,
      username: cleanUsername,
      displayName: userData.displayName || cleanUsername,
      email: userData.email || "",
      photoURL: userData.photoURL || "",
      bio: "",
      createdAt: now,
      updatedAt: now
    });

    await setDoc(doc(db, "usernames", cleanUsername), {
      uid: uid,
      username: cleanUsername,
      createdAt: now
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

// Delete account
export const deleteAccount = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    let username = null;
    if (userDoc.exists()) {
      username = userDoc.data().username;
    }

    await deleteDoc(userRef);

    if (username) {
      try {
        const usernameRef = doc(db, "usernames", username);
        await deleteDoc(usernameRef);
      } catch (err) {
        console.log("Username document already deleted");
      }
    }

    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
    }

    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};