// src/pages/Home.jsx - Instagram Style Mobile (FORCE FIX)
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
      {/* Mobile Top Bar - Instagram Style */}
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

      {/* Main Content - Stories */}
      <div className="main-content-mobile">
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