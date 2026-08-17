// src/services/storyService.js
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
  arrayUnion,
  onSnapshot
} from "firebase/firestore";
import { db } from "../config/firebase";

// Create story
export const createStory = async (userId, storyData) => {
  try {
    const storiesRef = collection(db, "stories");
    const storyId = doc(storiesRef).id;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await setDoc(doc(storiesRef, storyId), {
      storyId,
      ownerId: userId,
      mediaURL: storyData.mediaURL,
      mediaType: storyData.mediaType || "photo",
      text: storyData.text || "",
      createdAt: now,
      expiresAt: expiresAt,
      viewers: [],
      viewCount: 0,
      allowedViewers: storyData.allowedViewers || []
    });

    return storyId;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get all active stories (Only for owner + allowedViewers)
export const getActiveStories = async (currentUserId) => {
  try {
    const q = query(
      collection(db, "stories"),
      where("expiresAt", ">", new Date())
    );

    const snapshot = await getDocs(q);
    const stories = [];

    for (const storyDoc of snapshot.docs) {
      const storyData = storyDoc.data();
      
      // Privacy Check
      if (storyData.ownerId === currentUserId) {
        // Owner always sees
      } else if (storyData.allowedViewers && storyData.allowedViewers.length > 0) {
        if (!storyData.allowedViewers.includes(currentUserId)) {
          continue;
        }
      }

      const ownerDoc = await getDoc(doc(db, "users", storyData.ownerId));
      stories.push({
        id: storyDoc.id,
        ...storyData,
        owner: ownerDoc.data() || {}
      });
    }

    stories.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });

    return stories;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get user's OWN stories
export const getUserStories = async (userId) => {
  try {
    const q = query(
      collection(db, "stories"),
      where("ownerId", "==", userId),
      where("expiresAt", ">", new Date())
    );

    const snapshot = await getDocs(q);
    const stories = [];

    snapshot.forEach((doc) => {
      stories.push({ id: doc.id, ...doc.data() });
    });

    stories.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });

    return stories;
  } catch (error) {
    throw new Error(error.message);
  }
};

// View story
export const viewStory = async (storyId, userId) => {
  try {
    const storyRef = doc(db, "stories", storyId);
    const storyDoc = await getDoc(storyRef);

    if (storyDoc.exists()) {
      const viewers = storyDoc.data().viewers || [];
      
      if (!viewers.includes(userId)) {
        await updateDoc(storyRef, {
          viewers: arrayUnion(userId),
          viewCount: (storyDoc.data().viewCount || 0) + 1
        });
      }
    }
  } catch (error) {
    console.error("Error viewing story:", error);
  }
};

// Delete story
export const deleteStory = async (storyId) => {
  try {
    await deleteDoc(doc(db, "stories", storyId));
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get story viewers
export const getStoryViewers = async (storyId) => {
  try {
    const storyDoc = await getDoc(doc(db, "stories", storyId));
    
    if (!storyDoc.exists()) return [];

    const viewers = storyDoc.data().viewers || [];
    const viewerList = [];

    for (const viewerId of viewers) {
      const userDoc = await getDoc(doc(db, "users", viewerId));
      if (userDoc.exists()) {
        viewerList.push({
          uid: viewerId,
          ...userDoc.data()
        });
      }
    }

    return viewerList;
  } catch (error) {
    throw new Error(error.message);
  }
};