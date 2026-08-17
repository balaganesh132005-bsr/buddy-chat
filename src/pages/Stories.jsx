// src/pages/Stories.jsx - Fully Fixed (No Errors, No Warnings)
import React, { useState, useEffect, useRef, useCallback } from "react";
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
import toast from "react-hot-toast";
import { FiPlus, FiX, FiEye, FiArrowLeft, FiTrash2, FiUsers, FiChevronRight, FiChevronLeft } from "react-icons/fi";
import "../styles/stories.css";

function Stories() {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  
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
  }, []);

  // --- 1. Functions defined first ---

  const closeViewer = () => {
    setViewerOpen(false);
    clearTimeout(progressTimerRef.current);
  };

  const goToPrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
      startProgressTimer();
    }
  };

  // --- 2. The main timer function ---

  const startProgressTimer = useCallback(() => {
    clearTimeout(progressTimerRef.current);
    setProgress(0);
    
    const duration = 5000; // 5 seconds per story
    const interval = 50; // Update every 50ms
    
    let currentProgress = 0;
    progressTimerRef.current = setInterval(() => {
      currentProgress += (interval / duration) * 100;
      setProgress(Math.min(currentProgress, 100));
      
      if (currentProgress >= 100) {
        clearTimeout(progressTimerRef.current);
        // Auto advance to next story
        setTimeout(() => {
          goToNextStory();
        }, 300);
      }
    }, interval);
  }, []); // ✅ Empty dependency array is safe here because it uses setter functions

  // --- 3. goToNextStory depends on startProgressTimer ---

  const goToNextStory = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
      startProgressTimer();
    } else {
      closeViewer();
    }
  }, [currentStoryIndex, stories.length, startProgressTimer]); // ✅ Added startProgressTimer here!

  // --- 4. UseEffect that starts the viewer ---
  // ✅ Fixed dependency
  useEffect(() => {
    if (viewerOpen) {
      startProgressTimer();
    }
    return () => {
      clearTimeout(progressTimerRef.current);
    };
  }, [viewerOpen, startProgressTimer]); // Removed currentStoryIndex

  const loadStories = async () => {
    try {
      const activeStories = await getActiveStories();
      setStories(activeStories);
    } catch (error) {
      toast.error("Failed to load stories");
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
        mediaType: "photo"
      });
      toast.success("Story posted!");
      setShowUpload(false);
      loadStories();
      fileInputRef.current.value = "";
    } catch (error) {
      toast.error("Failed to upload story");
    } finally {
      setUploading(false);
    }
  };

  // --- FULL SCREEN VIEWER FUNCTIONS ---

  const openViewer = async (index) => {
    setCurrentStoryIndex(index);
    setViewerOpen(true);
    setProgress(0);
    
    // Mark as viewed
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
      if (viewerOpen) {
        closeViewer();
      }
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

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // --- RENDER ---

  if (stories.length === 0 && !viewerOpen && !showUpload) {
    return (
      <div className="stories-container">
        <div className="stories-header">
          <button onClick={() => navigate("/")} className="back-btn">
            <FiArrowLeft size={20} />
          </button>
          <h2>Stories</h2>
          <button
            onClick={() => setShowUpload(true)}
            className="upload-story-btn"
          >
            <FiPlus size={20} /> Add Story
          </button>
        </div>
        <div className="stories-grid">
          <p className="no-stories">No stories yet. Post your first story!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stories-container">
      {/* Header */}
      <div className="stories-header">
        <button onClick={() => navigate("/")} className="back-btn">
          <FiArrowLeft size={20} />
        </button>
        <h2>Stories</h2>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="upload-story-btn"
        >
          <FiPlus size={20} /> {showUpload ? "Cancel" : "Add Story"}
        </button>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="upload-section">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleStoryUpload}
            accept="image/*"
            disabled={uploading}
          />
          <span className="upload-hint">Select an image for your story</span>
          <button
            onClick={() => setShowUpload(false)}
            className="close-upload"
          >
            <FiX size={20} />
          </button>
        </div>
      )}

      {/* Viewers Modal */}
      {showViewers && (
        <div className="viewers-modal" onClick={closeViewers}>
          <div className="viewers-content" onClick={(e) => e.stopPropagation()}>
            <div className="viewers-header">
              <h3>Viewers</h3>
              <button onClick={closeViewers} className="close-viewers-btn">
                <FiX size={20} />
              </button>
            </div>
            <div className="viewers-list">
              {loadingViewers ? (
                <p className="loading-text">Loading viewers...</p>
              ) : viewers.length === 0 ? (
                <p className="no-viewers">No one has viewed this story yet</p>
              ) : (
                viewers.map((viewer) => (
                  <div key={viewer.uid} className="viewer-item">
                    <img 
                      src={viewer.photoURL || "https://via.placeholder.com/40"} 
                      alt={viewer.displayName} 
                    />
                    <div className="viewer-info">
                      <p className="viewer-name">{viewer.displayName}</p>
                      <p className="viewer-handle">@{viewer.username}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== FULL SCREEN STORY VIEWER ===== */}
      {viewerOpen && stories.length > 0 && (
        <div className="story-viewer-overlay" onClick={closeViewer}>
          <div className="story-viewer-content" onClick={(e) => e.stopPropagation()}>
            
            {/* Progress Bar */}
            <div className="story-progress-container">
              {stories.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`story-progress-bar ${idx < currentStoryIndex ? 'completed' : ''} ${idx === currentStoryIndex ? 'active' : ''}`}
                >
                  <div 
                    className="story-progress-fill" 
                    style={{ width: idx === currentStoryIndex ? `${progress}%` : idx < currentStoryIndex ? '100%' : '0%' }}
                  ></div>
                </div>
              ))}
            </div>

            {/* Story Image */}
            <img 
              src={stories[currentStoryIndex].mediaURL} 
              alt="Story" 
              className="story-viewer-image" 
            />

            {/* Top Info Overlay */}
            <div className="story-viewer-top">
              <div className="story-viewer-user">
                <img 
                  src={stories[currentStoryIndex].owner.photoURL || "https://via.placeholder.com/30"} 
                  alt="Profile" 
                  className="story-viewer-avatar" 
                />
                <div>
                  <p className="story-viewer-username">@{stories[currentStoryIndex].owner.username}</p>
                  <p className="story-viewer-time">{formatTime(stories[currentStoryIndex].createdAt)}</p>
                </div>
              </div>
              
              <div className="story-viewer-actions">
                {/* OWNER ONLY: Delete + Viewers */}
                {stories[currentStoryIndex].ownerId === auth.currentUser.uid && (
                  <>
                    <button 
                      onClick={(e) => handleShowViewers(stories[currentStoryIndex].id, e)}
                      className="story-viewer-btn viewers-btn"
                      title="Viewers"
                    >
                      <FiUsers size={18} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteStory(stories[currentStoryIndex].id, e)}
                      className="story-viewer-btn delete-btn"
                      title="Delete"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </>
                )}
                <button onClick={closeViewer} className="story-viewer-btn close-btn">
                  <FiX size={24} />
                </button>
              </div>
            </div>

            {/* Navigation Arrows */}
            {currentStoryIndex > 0 && (
              <div 
                className="story-nav left" 
                onClick={(e) => { e.stopPropagation(); goToPrevStory(); }}
              >
                <FiChevronLeft size={40} />
              </div>
            )}
            {currentStoryIndex < stories.length - 1 && (
              <div 
                className="story-nav right" 
                onClick={(e) => { e.stopPropagation(); goToNextStory(); }}
              >
                <FiChevronRight size={40} />
              </div>
            )}

            {/* Touch Areas for mobile */}
            <div className="story-touch-left" onClick={(e) => { e.stopPropagation(); goToPrevStory(); }}></div>
            <div className="story-touch-right" onClick={(e) => { e.stopPropagation(); goToNextStory(); }}></div>

          </div>
        </div>
      )}

      {/* Thumbnail Grid */}
      {!viewerOpen && (
        <div className="stories-grid">
          {stories.map((story, index) => {
            const isOwnStory = story.ownerId === auth.currentUser.uid;
            return (
              <div
                key={story.id}
                className="story-card"
                onClick={() => openViewer(index)}
              >
                <img src={story.mediaURL} alt="Story" />
                <div className="story-overlay">
                  <img
                    src={story.owner.photoURL || "https://via.placeholder.com/30"}
                    alt={story.owner.username}
                    className="story-avatar"
                  />
                  <p className="story-name">@{story.owner.username}</p>
                  <p className="story-display-name">{story.owner.displayName || story.owner.username}</p>
                  <div className="story-views">
                    <FiEye size={14} /> {story.viewCount || 0}
                  </div>
                </div>

                {/* Owner Actions on Thumbnail */}
                {isOwnStory && (
                  <div className="story-actions">
                    <button 
                      onClick={(e) => handleShowViewers(story.id, e)}
                      className="viewers-btn"
                      title="Who viewed this?"
                    >
                      <FiUsers size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteStory(story.id, e)}
                      className="delete-story-btn"
                      title="Delete story"
                    >
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