import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getUserStories } from "../services/storyService";
import { updateUserProfile } from "../services/authService";
import { uploadProfilePhoto } from "../services/storageService";
import toast from "react-hot-toast";
import { FiArrowLeft, FiEdit2, FiSave, FiX, FiCamera } from "react-icons/fi";
import "../styles/profile.css";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stories, setStories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef(null);

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // User login panni irukkana? illana home ku poiru
        if (!userId) {
          navigate("/");
          return;
        }

        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          toast.error("User profile not found! Please create username again.");
          // Username create panna redirect pannu
          navigate("/create-username");
          return;
        }

        const userData = userDoc.data();
        setUser({ uid: userId, ...userData });
        setEditData(userData);

        // User oda stories fetch pannu
        try {
          const userStories = await getUserStories(userId);
          setStories(userStories);
        } catch (storyErr) {
          console.error("Story fetch error:", storyErr);
          // Story error vanthalum profile work aagura maari ignore pannu
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading profile:", error);
        toast.error("Failed to load profile. Check console for details.");
        // App.js oda "/" ku poidu
        navigate("/");
      }
    };

    loadProfile();
  }, [userId, navigate]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const photoURL = await uploadProfilePhoto(userId, file);
      await updateUserProfile(userId, { photoURL });
      
      setUser(prev => ({ ...prev, photoURL }));
      setEditData(prev => ({ ...prev, photoURL }));
      toast.success("Photo updated!");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await updateUserProfile(userId, {
        displayName: editData.displayName,
        bio: editData.bio
      });
      setUser(prev => ({ ...prev, ...editData }));
      setIsEditing(false);
      toast.success("Profile updated!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (!user) {
    return <div className="profile-loading">User not found. Redirecting...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button onClick={() => navigate("/")} className="back-btn">
          <FiArrowLeft size={20} />
        </button>
        <h2>My Profile</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="edit-btn"
        >
          {isEditing ? <FiX size={20} /> : <FiEdit2 size={20} />}
        </button>
      </div>

      <div className="profile-content">
        {/* Photo Section */}
        <div className="photo-section">
          <img
            src={user?.photoURL || "https://via.placeholder.com/150"}
            alt={user?.displayName}
            className="profile-photo"
          />
          {isEditing && (
            <button
              onClick={() => photoInputRef.current?.click()}
              className="change-photo-btn"
              disabled={saving}
            >
              <FiCamera size={20} />
            </button>
          )}
          <input
            type="file"
            ref={photoInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            hidden
          />
        </div>

        {/* User Info */}
        <div className="profile-info">
          {isEditing ? (
            <>
              <input
                type="text"
                value={editData.displayName || ""}
                onChange={(e) =>
                  setEditData({ ...editData, displayName: e.target.value })
                }
                placeholder="Display Name"
                className="edit-input"
              />
              <textarea
                value={editData.bio || ""}
                onChange={(e) =>
                  setEditData({ ...editData, bio: e.target.value })
                }
                placeholder="Bio"
                className="edit-textarea"
              />
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="save-btn"
              >
                <FiSave size={16} /> {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <h3 className="profile-name">{user?.displayName}</h3>
              <p className="profile-username">@{user?.username}</p>
              <p className="profile-bio">{user?.bio || "No bio yet"}</p>
              <p className="profile-joined">
                Joined {user?.createdAt?.toDate?.()?.toLocaleDateString?.() || "Recently"}
              </p>
            </>
          )}
        </div>

        {/* Stories Section */}
        <div className="profile-stories">
          <h4>My Stories</h4>
          <div className="stories-grid">
            {stories.length === 0 ? (
              <p className="no-stories">No stories yet</p>
            ) : (
              stories.map((story) => (
                <div key={story.id} className="story-item">
                  <img src={story.mediaURL} alt="Story" />
                  <p className="story-views">{story.viewCount} views</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;