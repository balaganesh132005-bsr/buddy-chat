// src/pages/Home.jsx - Heartbeat System (Real-time Online Status)
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getActiveStories, viewStory, createStory, getUserStories, likeStory } from "../services/storyService";
import { uploadStoryMedia } from "../services/storageService";
import { updateLastSeen, markUserOffline } from "../services/authService";
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
  FiChevronRight,
  FiHome,
  FiHeart
} from "react-icons/fi";
import "../styles/home.css";

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stories, setStories] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStoryList, setViewerStoryList] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerProgress, setViewerProgress] = useState(0);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const progressTimerRef = useRef(null);

  const fileInputRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchHomeData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        // 🔥 Heartbeat: Update last seen every 10 seconds
        await updateLastSeen(currentUser.uid);
        heartbeatIntervalRef.current = setInterval(() => {
          if (auth.currentUser && isMounted) {
            updateLastSeen(auth.currentUser.uid);
          }
        }, 10000); // 10 seconds

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: currentUser.uid, ...userDoc.data() });
        }

        let fetchedStories = [];
        try {
          fetchedStories = await getActiveStories(currentUser.uid);
        } catch (storyErr) {
          console.warn("Stories collection not ready yet.");
          fetchedStories = [];
        }
        setStories(fetchedStories);

        let myFetchedStories = [];
        try {
          myFetchedStories = await getUserStories(currentUser.uid);
        } catch (myErr) {
          console.warn("My stories not loaded yet.");
          myFetchedStories = [];
        }
        setMyStories(myFetchedStories);
        
      } catch (error) {
        console.warn("Home data partially loaded.");
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();

    // 🔥 Handle tab/browser close
    const handleBeforeUnload = () => {
      if (auth.currentUser && isMounted) {
        markUserOffline(auth.currentUser.uid);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      isMounted = false;
      // 🔥 Stop heartbeat and mark offline
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (auth.currentUser) {
        markUserOffline(auth.currentUser.uid);
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, []);

  const groupStoriesByUser = (storiesList) => {
    const grouped = {};
    storiesList.forEach(story => {
      if (story.ownerId === auth.currentUser.uid) return;

      if (!grouped[story.ownerId]) {
        grouped[story.ownerId] = {
          ownerId: story.ownerId,
          owner: story.owner,
          stories: [],
          allSeen: true
        };
      }
      grouped[story.ownerId].stories.push(story);
      if (!story.viewers?.includes(auth.currentUser.uid)) {
        grouped[story.ownerId].allSeen = false;
      }
    });
    return Object.values(grouped);
  };

  const groupedStories = groupStoriesByUser(stories);

  const openViewer = (storyList, index) => {
    if (!storyList || storyList.length === 0) return;
    setViewerStoryList(storyList);
    setViewerIndex(index);
    setViewerOpen(true);
    setViewerProgress(0);
    startViewerTimer();
  };

  const closeViewer = () => {
    setViewerOpen(false);
    clearTimeout(progressTimerRef.current);
  };

  const goToNextStory = () => {
    if (viewerIndex < viewerStoryList.length - 1) {
      setViewerIndex(prev => prev + 1);
      setViewerProgress(0);
      startViewerTimer();
    } else {
      closeViewer();
    }
  };

  const goToPrevStory = () => {
    if (viewerIndex > 0) {
      setViewerIndex(prev => prev - 1);
      setViewerProgress(0);
      startViewerTimer();
    }
  };

  const startViewerTimer = () => {
    clearTimeout(progressTimerRef.current);
    setViewerProgress(0);
    const duration = 5000;
    const interval = 50;
    let currentProgress = 0;
    progressTimerRef.current = setInterval(() => {
      currentProgress += (interval / duration) * 100;
      setViewerProgress(Math.min(currentProgress, 100));
      if (currentProgress >= 100) {
        clearTimeout(progressTimerRef.current);
        setTimeout(() => goToNextStory(), 300);
      }
    }, interval);
  };

  useEffect(() => {
    if (viewerOpen && viewerStoryList.length > 0) {
      const story = viewerStoryList[viewerIndex];
      if (story) {
        setLikes(story.likes?.length || 0);
        setIsLiked(story.likes?.includes(auth.currentUser.uid) || false);
        if (story.ownerId !== auth.currentUser.uid) {
          viewStory(story.id, auth.currentUser.uid).catch(console.error);
        }
      }
    }
  }, [viewerOpen, viewerIndex, viewerStoryList]);

  const handleProfileClick = () => {
    if (myStories.length > 0) {
      openViewer(myStories, 0);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const mediaURL = await uploadStoryMedia(auth.currentUser.uid, file, "photo");
      await createStory(auth.currentUser.uid, { mediaURL, mediaType: "photo" });

      toast.success("Story posted!");
      
      const myActiveStories = await getUserStories(auth.currentUser.uid);
      setMyStories(myActiveStories);
      
      const activeStories = await getActiveStories(auth.currentUser.uid);
      setStories(activeStories);
      
      if (myActiveStories.length > 0) {
        openViewer(myActiveStories, 0);
      }
      
    } catch (error) {
      toast.error("Failed to upload story");
      console.error(error);
    } finally {
      fileInputRef.current.value = "";
    }
  };

  const handleLikeToggle = async () => {
    const storyId = viewerStoryList[viewerIndex]?.id;
    if (!storyId) return;
    await likeStory(storyId, auth.currentUser.uid);
    setIsLiked(!isLiked);
    setLikes(prev => isLiked ? prev - 1 : prev + 1);
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
      <div className="desktop-sidebar">
        <h2>BUDDYCHAT</h2>
        <nav className="desktop-nav">
          <Link to="/" className="desktop-nav-item active">
            <FiHome size={20} /> Home
          </Link>
          <Link to="/chats" className="desktop-nav-item">
            <FiMessageCircle size={20} /> Chats
          </Link>
          <Link to="/stories" className="desktop-nav-item">
            <FiImage size={20} /> Stories
          </Link>
          <Link to="/profile" className="desktop-nav-item">
            <FiUser size={20} /> Profile
          </Link>
          <Link to="/settings" className="desktop-nav-item">
            <FiSettings size={20} /> Settings
          </Link>
          <button onClick={handleLogout} className="desktop-nav-item logout">
            <FiLogOut size={20} /> Logout
          </button>
        </nav>
        <div className="sidebar-user">
          {user?.photoURL && <img src={user.photoURL} alt="Profile" />}
          <div>
            <p className="user-name">{user?.displayName}</p>
            <p className="user-handle">@{user?.username}</p>
            {/* 🔥 Real-time Status */}
            <p className={`user-status ${user?.lastSeen && (new Date() - user.lastSeen.toDate() < 30000) ? 'active' : ''}`}>
              {user?.lastSeen && (new Date() - user.lastSeen.toDate() < 30000) 
                ? '● Active now'
                : `Last seen ${user?.lastSeen?.toDate()?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' }) || 'recently'}`}
            </p>
          </div>
        </div>
      </div>

      <div className="mobile-top-bar">
        <div className="mobile-brand">
          <h1>BUDDYCHAT</h1>
        </div>
        <div className="mobile-nav-icons">
          <Link to="/chats" className="mobile-icon"><FiMessageCircle size={22} /></Link>
          <Link to="/stories" className="mobile-icon"><FiImage size={22} /></Link>
          <Link to="/profile" className="mobile-icon"><FiUser size={22} /></Link>
          <Link to="/settings" className="mobile-icon"><FiSettings size={22} /></Link>
          <button onClick={handleLogout} className="mobile-icon logout-icon"><FiLogOut size={22} /></button>
        </div>
      </div>

      <div className="main-content-mobile">
        <div className="home-stories-section">
          <div className="stories-header-row">
            <h3>Stories</h3>
            <Link to="/stories" className="view-all-stories">
              View All <FiEye size={14} />
            </Link>
          </div>
          <div className="stories-horizontal">
            
            <div 
              className={`story-circle own-story ${
                myStories.length > 0 && !myStories.every(s => s.viewers?.includes(auth.currentUser.uid)) ? '' : 'seen'
              }`}
              onClick={handleProfileClick}
            >
              <div className="story-circle-border">
                <img
                  src={
                    myStories.length > 0 
                      ? myStories[myStories.length - 1].mediaURL 
                      : (user?.photoURL || "https://via.placeholder.com/60")
                  }
                  alt="My Profile"
                  className="story-circle-img"
                />
                <div className="add-story-icon">+</div>
              </div>
              <p className="story-circle-name">You</p>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />

            {groupedStories.length === 0 ? (
              <p className="no-stories-home">No friends' stories.</p>
            ) : (
              groupedStories.map((group) => {
                const isSeen = group.allSeen;
                const owner = group.owner || { displayName: 'Unknown', username: 'unknown', photoURL: '' };
                const latestStory = group.stories[group.stories.length - 1];
                return (
                  <div
                    key={group.ownerId}
                    className={`story-circle ${isSeen ? 'seen' : ''}`}
                    onClick={() => openViewer(group.stories, 0)}
                  >
                    <div className="story-circle-border">
                      <img
                        src={latestStory.mediaURL}
                        alt="Story"
                        className="story-circle-img"
                      />
                    </div>
                    <p className="story-circle-name">
                      {owner.username || "User"}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {viewerOpen && viewerStoryList.length > 0 && (
        <div className="story-viewer-overlay" onClick={closeViewer}>
          <div className="story-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="story-progress-container">
              {viewerStoryList.map((_, idx) => (
                <div key={idx} className={`story-progress-bar ${idx < viewerIndex ? 'completed' : ''} ${idx === viewerIndex ? 'active' : ''}`}>
                  <div className="story-progress-fill" style={{ width: idx === viewerIndex ? `${viewerProgress}%` : idx < viewerIndex ? '100%' : '0%' }}></div>
                </div>
              ))}
            </div>

            <img src={viewerStoryList[viewerIndex].mediaURL} alt="Story" className="story-viewer-image" />

            <div className="story-viewer-top">
              <div className="story-viewer-user">
                <img src={viewerStoryList[viewerIndex].owner?.photoURL || "https://via.placeholder.com/30"} alt="Profile" className="story-viewer-avatar" />
                <div>
                  <p className="story-viewer-username">@{viewerStoryList[viewerIndex].owner?.username || "unknown"}</p>
                  <p className="story-viewer-time">Just now</p>
                </div>
              </div>
              <div className="story-viewer-actions">
                <button onClick={handleLikeToggle} className={`story-viewer-btn like-btn ${isLiked ? 'liked' : ''}`}>
                  <FiHeart size={20} color={isLiked ? '#ff3040' : 'white'} />
                  <span className="like-count">{likes}</span>
                </button>
                <button onClick={closeViewer} className="story-viewer-btn close-btn"><FiX size={24} /></button>
              </div>
            </div>

            {viewerIndex > 0 && (
              <div className="story-nav left" onClick={(e) => { e.stopPropagation(); goToPrevStory(); }}><FiChevronLeft size={40} /></div>
            )}
            {viewerIndex < viewerStoryList.length - 1 && (
              <div className="story-nav right" onClick={(e) => { e.stopPropagation(); goToNextStory(); }}><FiChevronRight size={40} /></div>
            )}

            <div className="story-touch-left" onClick={(e) => { e.stopPropagation(); goToPrevStory(); }}></div>
            <div className="story-touch-right" onClick={(e) => { e.stopPropagation(); goToNextStory(); }}></div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Home;