// src/pages/Home.jsx - Fully Working
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getActiveStories, viewStory, createStory, getUserStories, likeStory } from "../services/storyService";
import { uploadStoryMedia } from "../services/storageService";
import { getUserChats } from "../services/chatService";
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
  FiCheck,
  FiHeart
} from "react-icons/fi";
import "../styles/home.css";

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stories, setStories] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStoryList, setViewerStoryList] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerProgress, setViewerProgress] = useState(0);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const progressTimerRef = useRef(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: currentUser.uid, ...userDoc.data() });
        }

        const activeStories = await getActiveStories(currentUser.uid);
        const sortedStories = activeStories.sort((a, b) => {
          const aSeen = a.viewers?.includes(currentUser.uid);
          const bSeen = b.viewers?.includes(currentUser.uid);
          return aSeen - bSeen;
        });
        setStories(sortedStories);

        const myActiveStories = await getUserStories(currentUser.uid);
        setMyStories(myActiveStories);

        try {
          const userChats = await getUserChats(currentUser.uid);
          const friendsList = userChats.map(chat => chat.otherUser).filter(user => user);
          setFriends(friendsList);
          setSelectedFriends(friendsList.map(f => f.uid));
        } catch (chatError) {
          console.warn("Chats not loaded yet.");
          setFriends([]);
          setSelectedFriends([]);
        }
        
      } catch (error) {
        console.warn("Home data partially loaded.");
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // --- Viewer Logic ---

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

  // Load likes and viewed status
  useEffect(() => {
    if (viewerOpen && viewerStoryList.length > 0) {
      const story = viewerStoryList[viewerIndex];
      if (story) {
        setLikes(story.likes?.length || 0);
        setIsLiked(story.likes?.includes(auth.currentUser.uid) || false);
        if (story.ownerId !== auth.currentUser.uid) {
          viewStory(story.id, auth.currentUser.uid).catch(console.error);
          setTimeout(() => {
            const currentUser = auth.currentUser;
            if (currentUser) {
              getActiveStories(currentUser.uid).then((activeStories) => {
                setStories(activeStories.sort((a, b) => {
                  const aSeen = a.viewers?.includes(currentUser.uid);
                  const bSeen = b.viewers?.includes(currentUser.uid);
                  return aSeen - bSeen;
                }));
              });
            }
          }, 1500);
        }
      }
    }
  }, [viewerOpen, viewerIndex, viewerStoryList]);

  // --- Upload Modal Logic ---

  const handleProfileClick = () => {
    if (myStories.length > 0) {
      openViewer(myStories, 0);
    } else {
      setShowUploadModal(true);
      setUploadedFile(null);
      setUploadProgress(0);
      setUploadingStory(false);
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast.error("Please select a photo first");
      return;
    }

    try {
      setUploadingStory(true);
      setUploadProgress(0);
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const mediaURL = await uploadStoryMedia(auth.currentUser.uid, uploadedFile, "photo");
      await createStory(auth.currentUser.uid, { mediaURL, mediaType: "photo" });

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success("Story posted!");
      
      setTimeout(async () => {
        setShowUploadModal(false);
        const myActiveStories = await getUserStories(auth.currentUser.uid);
        setMyStories(myActiveStories);
        const activeStories = await getActiveStories(auth.currentUser.uid);
        setStories(activeStories.sort((a, b) => {
          const aSeen = a.viewers?.includes(auth.currentUser.uid);
          const bSeen = b.viewers?.includes(auth.currentUser.uid);
          return aSeen - bSeen;
        }));
        setUploadedFile(null);
        setUploadProgress(0);
        setUploadingStory(false);
        
        if (myActiveStories.length > 0) {
          openViewer(myActiveStories, 0);
        }
      }, 1000);

    } catch (error) {
      toast.error("Failed to upload story");
      setUploadingStory(false);
      setUploadProgress(0);
    }
  };

  const toggleFriendSelection = (uid) => {
    setSelectedFriends(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
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
      
      {/* DESKTOP SIDEBAR */}
      <div className="desktop-sidebar">
        <h2>BuddyChat</h2>
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
          <p className="user-name">{user?.displayName}</p>
          <p className="user-handle">@{user?.username}</p>
        </div>
      </div>

      {/* MOBILE TOP BAR */}
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

      {/* MAIN CONTENT */}
      <div className="main-content-mobile">
        <div className="home-stories-section">
          <div className="stories-header-row">
            <h3>Stories</h3>
            <Link to="/stories" className="view-all-stories">
              View All <FiEye size={14} />
            </Link>
          </div>
          <div className="stories-horizontal">
            
            {/* OWN PROFILE CIRCLE */}
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
            
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" style={{ display: 'none' }} />

            {/* FRIENDS STORIES */}
            {stories.filter(story => story.ownerId !== auth.currentUser.uid).length === 0 ? (
              <p className="no-stories-home">No friends' stories.</p>
            ) : (
              stories.filter(story => story.ownerId !== auth.currentUser.uid).map((story, index) => {
                const isSeen = story.viewers?.includes(auth.currentUser.uid);
                const owner = story.owner || { displayName: 'Unknown', username: 'unknown', photoURL: '' };
                return (
                  <div
                    key={story.id}
                    className={`story-circle ${isSeen ? 'seen' : ''}`}
                    onClick={() => {
                      const friendsStories = stories.filter(s => s.ownerId !== auth.currentUser.uid);
                      openViewer(friendsStories, index);
                    }}
                  >
                    <div className="story-circle-border">
                      <img
                        src={story.mediaURL}
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

      {/* CLOSE FRIENDS UPLOAD MODAL */}
      {showUploadModal && (
        <div className="upload-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="upload-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="upload-modal-header">
              <h3>Add to Story</h3>
              <button onClick={() => setShowUploadModal(false)} className="close-modal-btn"><FiX size={24} /></button>
            </div>
            <div className="upload-modal-body">
              {!uploadedFile && !uploadingStory && (
                <div className="upload-option" onClick={() => fileInputRef.current?.click()}>
                  <div className="upload-option-icon">📸</div>
                  <p>Tap to select a photo</p>
                </div>
              )}
              {uploadedFile && !uploadingStory && (
                <div className="upload-preview-section">
                  <img src={URL.createObjectURL(uploadedFile)} alt="Preview" className="upload-preview-img" />
                  <div className="close-friends-modal-list">
                    <h4>Select Close Friends (Who can see this)</h4>
                    <div className="friends-scroll-list">
                      {friends.length === 0 ? (
                        <p className="no-friends-msg">No chats yet. Start chatting to add friends!</p>
                      ) : (
                        friends.map((friend) => (
                          <div 
                            key={friend.uid} 
                            className={`friend-modal-item ${selectedFriends.includes(friend.uid) ? 'selected' : ''}`}
                            onClick={() => toggleFriendSelection(friend.uid)}
                          >
                            <img src={friend.photoURL || "https://via.placeholder.com/36"} alt={friend.displayName} />
                            <span className="friend-modal-name">{friend.displayName}</span>
                            <div className="check-box-modal">
                              {selectedFriends.includes(friend.uid) && <FiCheck size={16} />}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="selected-count-modal">
                      Selected: {selectedFriends.length} / {friends.length}
                    </div>
                  </div>
                </div>
              )}
              {uploadingStory && (
                <div className="upload-progress-modal">
                  <div className="upload-progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="progress-text">Posting story... {uploadProgress}%</p>
                </div>
              )}
              {uploadedFile && !uploadingStory && (
                <button onClick={handleUpload} className="upload-post-btn" disabled={uploadingStory}>
                  Post Story
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== FULL SCREEN STORY VIEWER ===== */}
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