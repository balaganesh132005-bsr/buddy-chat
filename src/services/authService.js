// src/services/authService.js
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
  collection,
  query,
  where,
  getDocs,
  limit
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

// Check if user document already exists (and has a username)
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

// Create username + user profile document
export const createUsername = async (uid, username, userData) => {
  try {
    const cleanUsername = username.trim().toLowerCase();

    // Double-check availability before writing
    const isAvailable = await checkUsernameAvailability(cleanUsername);
    if (!isAvailable) {
      throw new Error("Username is no longer available");
    }

    const now = new Date();

    // Create the user profile document
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

    // Reserve the username (maps username -> uid, for lookups + uniqueness)
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

// Update user profile fields
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

// Log out
export const logout = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Search for a user by exact username
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

// Delete account (user profile + username reservation + auth account)
export const deleteAccount = async (uid, username) => {
  try {
    if (username) {
      await deleteDoc(doc(db, "usernames", username.trim().toLowerCase()));
    }

    await deleteDoc(doc(db, "users", uid));

    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
    }

    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};