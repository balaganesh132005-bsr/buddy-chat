// src/pages/Stories.jsx - Clean
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { 
  getActiveStories, 
  createStory, 
  viewStory, 
  deleteStory,
  getStoryViewers 
} from "../services/storyService";
import { uploadStoryMedia } from "../services/storageService";
import { getUserChats } from "../services/chatService";
import toast from "react-hot-toast";
import { FiPlus, FiX, FiEye, FiArrowLeft, FiTrash2, FiUsers, FiCheck } from "react-icons/fi";
import "../styles/stories.css";

function Stories() {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadStories();
    loadFriends();
  }, []);

  const loadStories = async () => {
    try {
      const activeStories = await getActiveStories(auth.currentUser.uid);
      setStories(activeStories);
    } catch (error) {
      toast.error("Failed to load stories");
    }
  };

  const loadFriends = async () => {
    try {
      const userChats = await getUserChats(auth.currentUser.uid);
      const friendsList = userChats.map(chat => chat.otherUser).filter(user => user);
      setFriends(friendsList);
      setSelectedFriends(friendsList.map(f => f.uid));
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const toggleFriendSelection = (uid) => {
    setSelectedFriends(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleStoryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const mediaURL = await uploadStoryMedia(auth.currentUser.uid, file, "photo");
      await createStory(auth.currentUser.uid, {
        mediaURL,
        mediaType: "photo",
        allowedViewers: selectedFriends
      });
      toast.success("Story posted!");
      setShowUpload(false);
      loadStories();
      fileInputRef.current.value = "";
    } catch (error) {
      toast.error("Failed to upload story");
    }
  };

  const handleViewStory = async (storyId) => {
    try {
      await viewStory(storyId, auth.currentUser.uid);
      loadStories();
    } catch (error) {
      console.error("Error viewing story:", error);
    }
  };

  const handleDeleteStory = async (storyId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this story?")) return;
    try {
      await deleteStory(storyId);
      toast.success("Story deleted");
      loadStories();
    } catch (error) {
      toast.error("Failed to delete story");
    }
  };

  const handleShowViewers = async (storyId, e) => {
    e.stopPropagation();
    try {
      const viewerList = await getStoryViewers(storyId);
      alert("Viewers: " + viewerList.map(v => v.displayName).join(", "));
    } catch (error) {
      toast.error("Failed to load viewers");
    }
  };

  return (
    <div className="stories-container">
      <div className="stories-header">
        <button onClick={() => navigate("/")} className="back-btn"><FiArrowLeft size={22} /></button>
        <h2>Stories</h2>
        <button onClick={() => setShowUpload(!showUpload)} className="upload-story-btn">
          {showUpload ? <FiX size={20} /> : <FiPlus size={20} />}
        </button>
      </div>

      {showUpload && (
        <div className="upload-section-modern">
          <div className="upload-drop-area" onClick={() => fileInputRef.current?.click()}>
            <div className="upload-icon">📸</div>
            <p>Tap to select a photo</p>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleStoryUpload} accept="image/*" hidden />
          
          <div className="close-friends-section">
            <h4>Select Close Friends (Who can see this)</h4>
            <div className="friends-list-select">
              {friends.length === 0 ? (
                <p className="no-friends-msg">No chats yet. Start chatting to add friends!</p>
              ) : (
                friends.map((friend) => (
                  <div 
                    key={friend.uid} 
                    className={`friend-select-item ${selectedFriends.includes(friend.uid) ? 'selected' : ''}`}
                    onClick={() => toggleFriendSelection(friend.uid)}
                  >
                    <img src={friend.photoURL || "https://via.placeholder.com/36"} alt={friend.displayName} />
                    <span className="friend-name">{friend.displayName}</span>
                    <div className="check-box">
                      {selectedFriends.includes(friend.uid) && <FiCheck size={16} />}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="selected-count">
              Selected: {selectedFriends.length} / {friends.length}
            </div>
          </div>
        </div>
      )}

      <div className="stories-grid">
        {stories.length === 0 ? (
          <p className="no-stories">No stories yet. Post your first story!</p>
        ) : (
          stories.map((story) => {
            const isOwnStory = story.ownerId === auth.currentUser.uid;
            return (
              <div key={story.id} className="story-card" onClick={() => handleViewStory(story.id)}>
                <img src={story.mediaURL} alt="Story" />
                <div className="story-overlay">
                  <img src={story.owner.photoURL || "https://via.placeholder.com/30"} alt={story.owner.username} className="story-avatar" />
                  <p className="story-name">@{story.owner.username}</p>
                  <div className="story-views">
                    <FiEye size={14} /> {story.viewCount || 0}
                  </div>
                </div>
                {isOwnStory && (
                  <div className="story-actions">
                    <button onClick={(e) => handleShowViewers(story.id, e)} className="viewers-btn">
                      <FiUsers size={16} />
                    </button>
                    <button onClick={(e) => handleDeleteStory(story.id, e)} className="delete-story-btn">
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Stories;