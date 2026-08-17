// src/pages/Home.jsx - Only Stories, No Groups
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getActiveStories } from "../services/storyService";
import toast from "react-hot-toast";
import {
  FiHome,
  FiMessageCircle,
  FiImage,
  FiUser,
  FiSettings,
  FiLogOut,
  FiEye
} from "react-icons/fi";
import "../styles/home.css";

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        setUser({ uid: currentUser.uid, ...userDoc.data() });

        const activeStories = await getActiveStories();
        setStories(activeStories);
      } catch (error) {
        toast.error("Failed to load home data");
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>BuddyChat</h1>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className="nav-item active">
            <FiHome size={20} />
            <span>Home</span>
          </Link>
          <Link to="/chats" className="nav-item">
            <FiMessageCircle size={20} />
            <span>Chats</span>
          </Link>
          <Link to="/stories" className="nav-item">
            <FiImage size={20} />
            <span>Stories</span>
          </Link>
          <Link to="/profile" className="nav-item">
            <FiUser size={20} />
            <span>Profile</span>
          </Link>
          <Link to="/settings" className="nav-item">
            <FiSettings size={20} />
            <span>Settings</span>
          </Link>
          <button onClick={handleLogout} className="nav-item logout">
            <FiLogOut size={20} />
            <span>Logout</span>
          </button>
        </nav>

        <div className="sidebar-user">
          {user?.photoURL && (
            <img src={user.photoURL} alt={user.displayName} />
          )}
          <div>
            <p className="user-name">{user?.displayName || "User"}</p>
            <p className="user-handle">@{user?.username}</p>
          </div>
        </div>
      </div>

      {/* Main Content - Only Stories (Instagram Style) */}
      <div className="main-content">
        {/* Stories Row */}
        <div className="home-stories-section">
          <div className="stories-header-row">
            <h3>Stories</h3>
            <Link to="/stories" className="view-all-stories">
              View All <FiEye size={14} />
            </Link>
          </div>
          <div className="stories-horizontal">
            {stories.length === 0 ? (
              <p className="no-stories-home">No stories. <Link to="/stories">Add one!</Link></p>
            ) : (
              stories.slice(0, 6).map((story) => (
                <div key={story.id} className="story-circle" onClick={() => navigate("/stories")}>
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;