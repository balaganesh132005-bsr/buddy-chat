// src/pages/Chats.jsx - Chats List Page
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { getUserChats } from "../services/chatService";
import { getUserGroups } from "../services/groupService";
import { searchUserByUsername } from "../services/authService";
import { getOrCreatePrivateChat } from "../services/chatService";
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import {
  FiSearch,
  FiPlus,
  FiHome,
  FiMessageCircle,
  FiImage,
  FiUser,
  FiSettings,
  FiLogOut
} from "react-icons/fi";
import "../styles/home.css";

function Chats() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [groups, setGroups] = useState([]);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChatsAndGroups = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        setUser({ uid: currentUser.uid, ...userDoc.data() });

        const userChats = await getUserChats(currentUser.uid);
        setChats(userChats);

        const userGroups = await getUserGroups(currentUser.uid);
        setGroups(userGroups);
      } catch (error) {
        toast.error("Failed to load chats");
      } finally {
        setLoading(false);
      }
    };

    fetchChatsAndGroups();
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const foundUser = await searchUserByUsername(query);
      if (foundUser && foundUser.uid !== auth.currentUser.uid) {
        setSearchResults([foundUser]);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const handleStartChat = async (targetUserId) => {
    try {
      const chatId = await getOrCreatePrivateChat(auth.currentUser.uid, targetUserId);
      setSearchQuery("");
      setSearchResults([]);
      navigate(`/chat/${chatId}`);
    } catch (error) {
      toast.error("Failed to start chat");
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
        <h2>BUDDYCHAT</h2>
        <nav className="desktop-nav">
          <Link to="/" className="desktop-nav-item">
            <FiHome size={20} /> Home
          </Link>
          <Link to="/chats" className="desktop-nav-item active">
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
          <h1>BUDDYCHAT</h1>
        </div>
        <div className="mobile-nav-icons">
          <Link to="/" className="mobile-icon"><FiHome size={22} /></Link>
          <Link to="/chats" className="mobile-icon"><FiMessageCircle size={22} /></Link>
          <Link to="/stories" className="mobile-icon"><FiImage size={22} /></Link>
          <Link to="/profile" className="mobile-icon"><FiUser size={22} /></Link>
          <Link to="/settings" className="mobile-icon"><FiSettings size={22} /></Link>
          <button onClick={handleLogout} className="mobile-icon logout-icon"><FiLogOut size={22} /></button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content-mobile">
        <div className="chats-header">
          <h2>CHATS</h2>
          <button onClick={() => navigate("/groups")} className="chats-create-btn">
            <FiPlus size={20} /> New Group
          </button>
        </div>

        <div className="chats-search-box">
          <FiSearch size={20} />
          <input
            type="text"
            placeholder="Search username..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <div key={result.uid} className="search-result-item">
                  <img src={result.photoURL || "https://via.placeholder.com/40"} alt={result.displayName} />
                  <div className="result-info">
                    <p className="result-name">{result.displayName}</p>
                    <p className="result-handle">@{result.username}</p>
                  </div>
                  <button onClick={() => handleStartChat(result.uid)} className="message-btn">Message</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {groups.length > 0 && (
          <div className="chats-section">
            <h3 className="chats-section-title">Groups</h3>
            <div className="chats-list">
              {groups.map((group) => (
                <div key={group.id} className="chat-item group-item" onClick={() => navigate(`/group/${group.id}`)}>
                  <img src={group.photoURL || "https://via.placeholder.com/50"} alt={group.name} className="group-avatar" />
                  <div className="chat-info">
                    <p className="chat-name">{group.name}</p>
                    <p className="chat-preview">{group.members?.length || 0} members</p>
                  </div>
                  <span className="chat-time">{group.lastMessage || "Start chatting..."}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="chats-section">
          <h3 className="chats-section-title">Private Chats</h3>
          <div className="chats-list">
            {chats.length === 0 ? (
              <div className="empty-state">
                <p>No private chats yet. Search for a user above!</p>
              </div>
            ) : (
              chats.map((chat) => (
                <Link key={chat.id} to={`/chat/${chat.id}`} className="chat-item">
                  <img src={chat.otherUser?.photoURL || "https://via.placeholder.com/50"} alt={chat.otherUser?.displayName || "User"} />
                  <div className="chat-info">
                    <p className="chat-name">{chat.otherUser?.displayName || "Unknown"}</p>
                    <p className="chat-preview">{chat.lastMessage || "Start a chat..."}</p>
                  </div>
                  <span className="chat-time">{chat.updatedAt?.toDate?.()?.toLocaleDateString?.() || ""}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chats;