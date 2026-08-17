// src/pages/Stories.jsx - Complete Stories Page
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { 
  getActiveStories, 
  createStory, 
  viewStory, 
  deleteStory,
  getStoryViewers 
} from "../services/storyService";
import { uploadStoryMedia } from "../services/storageService";
import { getUserChats } from "../services/chatService"; // For Close Friends list
import toast from "react-hot-toast";
import { FiPlus, FiX, FiEye, FiArrowLeft, FiTrash2, FiUsers, FiChevronLeft, FiChevronRight, FiCheck, FiUser } from "react-icons/fi";
import "../styles/stories.css";

function Stories() {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Close Friends state
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  
  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [viewers, setViewers] = useState([]);
  const [showViewers, setShowViewers] = useState(false);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const fileInputRef = useRef(null);
  const progressTimerRef = useRef(null);

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
      // Default: Select all friends
      setSelectedFriends(friendsList.map(f => f.uid));
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const handleStoryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const mediaURL = await uploadStoryMedia(auth.currentUser.uid, file, "photo");
      await createStory(auth.currentUser.uid, {
        mediaURL,
        mediaType: "photo",
        allowedViewers: selectedFriends
      });
      toast.success("Story posted to selected friends!");
      setShowUpload(false);
      loadStories();
      fileInputRef.current.value = "";
    } catch (error) {
      toast.error("Failed to upload story");
    } finally {
      setUploading(false);
    }
  };

  const toggleFriendSelection = (uid) => {
    setSelectedFriends(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    clearTimeout(progressTimerRef.current);
  }, []);

  const goToNextStory = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
      startProgressTimer();
    } else {
      closeViewer();
    }
  }, [currentStoryIndex, stories.length, closeViewer]);

  const goToPrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
      startProgressTimer();
    }
  };

  const startProgressTimer = useCallback(() => {
    clearTimeout(progressTimerRef.current);
    setProgress(0);
    const duration = 5000;
    const interval = 50;
    let currentProgress = 0;
    progressTimerRef.current = setInterval(() => {
      currentProgress += (interval / duration) * 100;
      setProgress(Math.min(currentProgress, 100));
      if (currentProgress >= 100) {
        clearTimeout(progressTimerRef.current);
        setTimeout(() => goToNextStory(), 300);
      }
    }, interval);
  }, [goToNextStory]);

  useEffect(() => {
    if (viewerOpen) startProgressTimer();
    return () => clearTimeout(progressTimerRef.current);
  }, [viewerOpen, startProgressTimer]);

  const openViewer = async (index) => {
    setCurrentStoryIndex(index);
    setViewerOpen(true);
    setProgress(0);
    const story = stories[index];
    if (story) {
      try {
        await viewStory(story.id, auth.currentUser.uid);
        loadStories();
      } catch (error) {
        console.error("Error viewing story:", error);
      }
    }
  };

  const handleDeleteStory = async (storyId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this story?")) return;
    try {
      await deleteStory(storyId);
      toast.success("Story deleted");
      loadStories();
      if (viewerOpen) closeViewer();
    } catch (error) {
      toast.error("Failed to delete story");
    }
  };

  const handleShowViewers = async (storyId, e) => {
    e.stopPropagation();
    try {
      setLoadingViewers(true);
      const viewerList = await getStoryViewers(storyId);
      setViewers(viewerList);
      setShowViewers(true);
    } catch (error) {
      toast.error("Failed to load viewers");
    } finally {
      setLoadingViewers(false);
    }
  };

  const closeViewers = () => {
    setShowViewers(false);
    setViewers([]);
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

      {/* Upload Section with Close Friends Selector */}
      {showUpload && (
        <div className="upload-section-modern">
          <div className="upload-drop-area" onClick={() => fileInputRef.current?.click()}>
            <div className="upload-icon">📸</div>
            <p>Tap to select a photo</p>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleStoryUpload} accept="image/*" hidden />
          {uploading && <div className="upload-progress"><div className="progress-bar"></div></div>}
          
          <div className="close-friends-section">
            <h4>Select Close Friends (Who can see this)</h4>
            <div className="friends-list-select">
              {friends.length === 0 ? (
                <p className="no-friends-msg">Start chatting with someone to add them as a close friend!</p>
              ) : (
                friends.map((friend) => (
                  <div 
                    key={friend.uid} 
                    className={`friend-select-item ${selectedFriends.includes(friend.uid) ? 'selected' : ''}`}
                    onClick={() => toggleFriendSelection(friend.uid)}
                  >
                    <img src={friend.photoURL || "https://via.placeholder.com/40"} alt={friend.displayName} />
                    <span className="friend-name">{friend.displayName}</span>
                    <div className="check-box">
                      {selectedFriends.includes(friend.uid) && <FiCheck size={16} />}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="selected-count">
              Selected: {selectedFriends.length} / {friends.length} friends
            </div>
          </div>
        </div>
      )}

      {/* Viewers Modal */}
      {showViewers && (
        <div className="viewers-modal" onClick={closeViewers}>
          <div className="viewers-content" onClick={(e) => e.stopPropagation()}>
            <div className="viewers-header">
              <h3>Viewers</h3>
              <button onClick={closeViewers} className="close-viewers-btn"><FiX size={20} /></button>
            </div>
            <div className="viewers-list">
              {loadingViewers ? <p className="loading-text">Loading...</p> : 
                viewers.length === 0 ? <p className="no-viewers">No viewers yet</p> :
                viewers.map(v => (
                  <div key={v.uid} className="viewer-item">
                    <img src={v.photoURL || "https://via.placeholder.com/40"} alt={v.displayName} />
                    <div className="viewer-info">
                      <p className="viewer-name">{v.displayName}</p>
                      <p className="viewer-handle">@{v.username}</p>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Viewer */}
      {viewerOpen && stories.length > 0 && (
        <div className="story-viewer-overlay" onClick={closeViewer}>
          <div className="story-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="story-progress-container">
              {stories.map((_, idx) => (
                <div key={idx} className={`story-progress-bar ${idx < currentStoryIndex ? 'completed' : ''} ${idx === currentStoryIndex ? 'active' : ''}`}>
                  <div className="story-progress-fill" style={{ width: idx === currentStoryIndex ? `${progress}%` : idx < currentStoryIndex ? '100%' : '0%' }}></div>
                </div>
              ))}
            </div>
            <img src={stories[currentStoryIndex].mediaURL} alt="Story" className="story-viewer-image" />
            
            <div className="story-viewer-top">
              <div className="story-viewer-user">
                <img src={stories[currentStoryIndex].owner.photoURL || "https://via.placeholder.com/30"} alt="Profile" className="story-viewer-avatar" />
                <div>
                  <p className="story-viewer-username">@{stories[currentStoryIndex].owner.username}</p>
                  <p className="story-viewer-time">Just now</p>
                </div>
              </div>
              <div className="story-viewer-actions">
                {/* Viewers & Delete - ONLY OWNER */}
                {stories[currentStoryIndex].ownerId === auth.currentUser.uid && (
                  <>
                    <button onClick={(e) => handleShowViewers(stories[currentStoryIndex].id, e)} className="story-viewer-btn viewers-btn">
                      <FiUsers size={18} />
                    </button>
                    <button onClick={(e) => handleDeleteStory(stories[currentStoryIndex].id, e)} className="story-viewer-btn delete-btn">
                      <FiTrash2 size={18} />
                    </button>
                  </>
                )}
                <button onClick={closeViewer} className="story-viewer-btn close-btn"><FiX size={24} /></button>
              </div>
            </div>
            
            {currentStoryIndex > 0 && <div className="story-nav left" onClick={(e) => { e.stopPropagation(); goToPrevStory(); }}><FiChevronLeft size={40} /></div>}
            {currentStoryIndex < stories.length - 1 && <div className="story-nav right" onClick={(e) => { e.stopPropagation(); goToNextStory(); }}><FiChevronRight size={40} /></div>}
            <div className="story-touch-left" onClick={(e) => { e.stopPropagation(); goToPrevStory(); }}></div>
            <div className="story-touch-right" onClick={(e) => { e.stopPropagation(); goToNextStory(); }}></div>
          </div>
        </div>
      )}

      {/* Grid - 2 columns for desktop and mobile */}
      {!viewerOpen && (
        <div className="stories-grid">
          {stories.map((story, index) => {
            const isOwnStory = story.ownerId === auth.currentUser.uid;
            return (
              <div key={story.id} className="story-card" onClick={() => openViewer(index)}>
                <img src={story.mediaURL} alt="Story" />
                <div className="story-overlay">
                  <img src={story.owner.photoURL || "https://via.placeholder.com/30"} alt={story.owner.username} className="story-avatar" />
                  <p className="story-name">@{story.owner.username}</p>
                  {/* Views - ONLY OWNER sees count */}
                  {isOwnStory && (
                    <div className="story-views"><FiEye size={14} /> {story.viewCount || 0}</div>
                  )}
                  {!isOwnStory && (
                    <div className="story-views"><FiEye size={14} /></div>
                  )}
                </div>
                {/* Plus & Delete buttons on own stories */}
                {isOwnStory && (
                  <div className="story-actions">
                    <button onClick={() => setShowUpload(true)} className="add-story-btn">
                      <FiPlus size={16} />
                    </button>
                    <button onClick={(e) => handleDeleteStory(story.id, e)} className="delete-story-btn">
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Stories;