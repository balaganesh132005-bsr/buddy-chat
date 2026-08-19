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

// Delete account (user profile + username reservation + auth account) - FIXED
export const deleteAccount = async (uid) => {
  try {
    // Step 1: Delete the user's Firestore document
    await deleteDoc(doc(db, "users", uid));

    // Step 2: Find and delete the username document
    try {
      const usernamesRef = collection(db, "usernames");
      const q = query(usernamesRef, where("uid", "==", uid));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach(async (docSnap) => {
        await deleteDoc(doc(db, "usernames", docSnap.id));
      });
    } catch (err) {
      console.log("Error deleting username entry:", err);
    }

    // Step 3: Delete the Firebase Auth user
    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
    }

    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};
// Add this function to src/services/authService.js
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