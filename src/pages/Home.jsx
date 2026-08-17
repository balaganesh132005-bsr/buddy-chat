// src/pages/Home.jsx - Stories Row + Viewer + Profile Upload
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getActiveStories, viewStory } from "../services/storyService";
import { uploadStoryMedia } from "../services/storageService";
import { createStory } from "../services/storyService";
import toast from "react-hot-toast";
import {
  FiMessageCircle,
  FiImage,
  FiUser,
  FiSettings,
  FiLogOut,
  FiEye,
  FiX,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";
import "../styles/home.css";

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [uploadingStory, setUploadingStory] = useState(false);
  const storyFileInputRef = useRef(null);
  const progressTimerRef = useRef(null);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        setUser({ uid: currentUser.uid, ...userDoc.data() });

        const activeStories = await getActiveStories(currentUser.uid);
        // Sort: Unseen stories first (Owner stories always seen)
        const sortedStories = activeStories.sort((a, b) => {
          const aSeen = a.viewers?.includes(currentUser.uid) || a.ownerId === currentUser.uid;
          const bSeen = b.viewers?.includes(currentUser.uid) || b.ownerId === currentUser.uid;
          return aSeen - bSeen;
        });
        setStories(sortedStories);
      } catch (error) {
        toast.error("Failed to load home data");
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // --- Viewer Logic ---

  const closeViewer = () => {
    setViewerOpen(false);
    clearTimeout(progressTimerRef.current);
    loadStories(); // Refresh to update seen status
  };

  const goToNextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
      startProgressTimer();
    } else {
      closeViewer();
    }
  };

  const goToPrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
      startProgressTimer();
    }
  };

  const startProgressTimer = () => {
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
  };

  const loadStories = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const activeStories = await getActiveStories(currentUser.uid);
      const sortedStories = activeStories.sort((a, b) => {
        const aSeen = a.viewers?.includes(currentUser.uid) || a.ownerId === currentUser.uid;
        const bSeen = b.viewers?.includes(currentUser.uid) || b.ownerId === currentUser.uid;
        return aSeen - bSeen;
      });
      setStories(sortedStories);
    } catch (error) {
      console.error("Error loading stories:", error);
    }
  };

  const openViewer = async (index) => {
    setCurrentStoryIndex(index);
    setViewerOpen(true);
    setProgress(0);
    const story = stories[index];
    if (story && story.ownerId !== auth.currentUser.uid) {
      try {
        await viewStory(story.id, auth.currentUser.uid);
        setTimeout(() => loadStories(), 1000);
      } catch (error) {
        console.error("Error viewing story:", error);
      }
    }
    startProgressTimer();
  };

  // --- Profile Circle Upload ---

  const handleProfileClick = () => {
    storyFileInputRef.current?.click();
  };

  const handleProfileStoryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingStory(true);
      const mediaURL = await uploadStoryMedia(auth.currentUser.uid, file, "photo");
      await createStory(auth.currentUser.uid, {
        mediaURL,
        mediaType: "photo"
      });
      toast.success("Story posted from profile!");
      loadStories();
      storyFileInputRef.current.value = "";
    } catch (error) {
      toast.error("Failed to upload story");
    } finally {
      setUploadingStory(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="home-container">
      {/* Mobile Top Bar */}
      <div className="mobile-top-bar">
        <div className="mobile-brand">
          <h1>BuddyChat</h1>
        </div>
        <div className="mobile-nav-icons">
          <Link to="/chats" className="mobile-icon"><FiMessageCircle size={22} /></Link>
          <Link to="/stories" className="mobile-icon"><FiImage size={22} /></Link>
          <Link to="/profile" className="mobile-icon"><FiUser size={22} /></Link>
          <Link to="/settings" className="mobile-icon"><FiSettings size={22} /></Link>
          <button onClick={handleLogout} className="mobile-icon logout-icon"><FiLogOut size={22} /></button>
        </div>
      </div>

      {/* Main Content - Stories Row */}
      <div className="main-content-mobile">
        <div className="home-stories-section">
          <div className="stories-header-row">
            <h3>Stories</h3>
            <Link to="/stories" className="view-all-stories">
              View All <FiEye size={14} />
            </Link>
          </div>
          <div className="stories-horizontal">
            {/* Own Profile Story Upload Circle */}
            <div className="story-circle own-story" onClick={handleProfileClick}>
              <div className="story-circle-border">
                <img
                  src={user?.photoURL || "https://via.placeholder.com/60"}
                  alt="My Profile"
                  className="story-circle-img"
                />
                <div className="add-story-icon">+</div>
              </div>
              <p className="story-circle-name">You</p>
            </div>
            <input
              type="file"
              ref={storyFileInputRef}
              onChange={handleProfileStoryUpload}
              accept="image/*"
              hidden
            />

            {/* Friends Stories */}
            {stories.length === 0 ? (
              <p className="no-stories-home">No stories.</p>
            ) : (
              stories.map((story, index) => {
                const isSeen = story.viewers?.includes(auth.currentUser.uid) || story.ownerId === auth.currentUser.uid;
                return (
                  <div
                    key={story.id}
                    className={`story-circle ${isSeen ? 'seen' : ''}`}
                    onClick={() => openViewer(index)}
                  >
                    <div className="story-circle-border">
                      <img
                        src={story.mediaURL}
                        alt="Story"
                        className="story-circle-img"
                      />
                    </div>
                    <p className="story-circle-name">
                      {story.owner?.username || "User"}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ===== FULL SCREEN STORY VIEWER ===== */}
      {viewerOpen && stories.length > 0 && (
        <div className="story-viewer-overlay" onClick={closeViewer}>
          <div className="story-viewer-content" onClick={(e) => e.stopPropagation()}>
            
            {/* Progress Lines */}
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

            {/* Top Info */}
            <div className="story-viewer-top">
              <div className="story-viewer-user">
                <img
                  src={stories[currentStoryIndex].owner.photoURL || "https://via.placeholder.com/30"}
                  alt="Profile"
                  className="story-viewer-avatar"
                />
                <div>
                  <p className="story-viewer-username">@{stories[currentStoryIndex].owner.username}</p>
                  <p className="story-viewer-time">Just now</p>
                </div>
              </div>
              <button onClick={closeViewer} className="story-viewer-btn close-btn">
                <FiX size={24} />
              </button>
            </div>

            {/* Navigation Arrows (Desktop) */}
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

            {/* Touch Areas (Mobile Swipe) */}
            <div className="story-touch-left" onClick={(e) => { e.stopPropagation(); goToPrevStory(); }}></div>
            <div className="story-touch-right" onClick={(e) => { e.stopPropagation(); goToNextStory(); }}></div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Home;