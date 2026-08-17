// src/pages/Home.jsx - Close Friends Modal + Auto Upload Progress
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getActiveStories, viewStory, createStory } from "../services/storyService";
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
  FiCheck
} from "react-icons/fi";
import "../styles/home.css";

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  
  const fileInputRef = useRef(null);
  const progressTimerRef = useRef(null);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        setUser({ uid: currentUser.uid, ...userDoc.data() });

        const activeStories = await getActiveStories(currentUser.uid);
        const sortedStories = activeStories.sort((a, b) => {
          const aSeen = a.viewers?.includes(currentUser.uid) || a.ownerId === currentUser.uid;
          const bSeen = b.viewers?.includes(currentUser.uid) || b.ownerId === currentUser.uid;
          return aSeen - bSeen;
        });
        setStories(sortedStories);

        // Load friends for Close Friends
        const userChats = await getUserChats(currentUser.uid);
        const friendsList = userChats.map(chat => chat.otherUser).filter(user => user);
        setFriends(friendsList);
        setSelectedFriends(friendsList.map(f => f.uid));
      } catch (error) {
        toast.error("Failed to load home data");
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // --- Upload Modal Logic ---

  const handleProfileClick = () => {
    setShowUploadModal(true);
    setUploadedFile(null);
    setUploadProgress(0);
    setUploadingStory(false);
    fileInputRef.current.value = "";
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
    if (selectedFriends.length === 0) {
      toast.error("Please select at least one Close Friend");
      return;
    }

    try {
      setUploadingStory(true);
      setUploadProgress(0);
      
      // Simulate progress
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
      await createStory(auth.currentUser.uid, {
        mediaURL,
        mediaType: "photo",
        allowedViewers: selectedFriends
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success("Story posted to Close Friends!");
      setTimeout(() => {
        setShowUploadModal(false);
        loadStories();
        setUploadedFile(null);
        setUploadProgress(0);
        setUploadingStory(false);
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
            
            {/* Own Profile Circle */}
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

      {/* ===== CLOSE FRIENDS UPLOAD MODAL ===== */}
      {showUploadModal && (
        <div className="upload-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="upload-modal-content" onClick={(e) => e.stopPropagation()}>
            
            <div className="upload-modal-header">
              <h3>Add to Story</h3>
              <button onClick={() => setShowUploadModal(false)} className="close-modal-btn"><FiX size={24} /></button>
            </div>

            <div className="upload-modal-body">
              
              {/* Step 1: Select Photo */}
              {!uploadedFile && !uploadingStory && (
                <div className="upload-option" onClick={() => fileInputRef.current?.click()}>
                  <div className="upload-option-icon">📸</div>
                  <p>Tap to select a photo</p>
                </div>
              )}

              {/* Step 2: Show Selected Photo + Close Friends */}
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

              {/* Step 3: Progress Bar */}
              {uploadingStory && (
                <div className="upload-progress-modal">
                  <div className="upload-progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="progress-text">Posting story... {uploadProgress}%</p>
                </div>
              )}

              {/* Step 4: Post Button */}
              {uploadedFile && !uploadingStory && (
                <button 
                  onClick={handleUpload} 
                  className="upload-post-btn"
                  disabled={uploadingStory || selectedFriends.length === 0}
                >
                  Post Story
                </button>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;