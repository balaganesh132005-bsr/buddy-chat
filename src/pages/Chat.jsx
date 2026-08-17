// src/pages/Chats.jsx - Desktop + Mobile Fix
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
  FiHome,
  FiImage,
  FiUser,
  FiSettings,
  FiLogOut,
  FiPlus,
  FiMessageCircle
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
  const [searching, setSearching] = useState(false);

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
      setSearching(false);
      return;
    }
    try {
      setSearching(true);
      const foundUser = await searchUserByUsername(query);
      if (foundUser && foundUser.uid !== auth.currentUser.uid) {
        setSearchResults([foundUser]);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
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
    <div className="chats-page-wrapper">
      {/* Top Bar (Desktop & Mobile) */}
      <div className="chats-top-bar">
        <div className="chats-brand">
          <Link to="/" className="brand-link">BuddyChat</Link>
        </div>
        <div className="chats-nav-icons">
          <Link to="/" className="nav-icon"><FiHome size={20} /></Link>
          <Link to="/chats" className="nav-icon active"><FiMessageCircle size={20} /></Link>
          <Link to="/stories" className="nav-icon"><FiImage size={20} /></Link>
          <Link to="/profile" className="nav-icon"><FiUser size={20} /></Link>
          <Link to="/settings" className="nav-icon"><FiSettings size={20} /></Link>
          <button onClick={handleLogout} className="nav-icon logout-btn"><FiLogOut size={20} /></button>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="chats-content">
        <div className="chats-header">
          <h2>Chats</h2>
          <button onClick={() => navigate("/groups")} className="create-btn">
            <FiPlus size={18} /> New Group
          </button>
        </div>

        {/* Search Bar */}
        <div className="chats-search">
          <div className="search-box">
            <FiSearch size={18} />
            <input
              type="text"
              placeholder="Search username..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <div key={result.uid} className="search-result-item">
                  <img src={result.photoURL || "https://via.placeholder.com/36"} alt={result.displayName} />
                  <div className="result-info">
                    <p className="result-name">{result.displayName}</p>
                    <p className="result-handle">@{result.username}</p>
                  </div>
                  <button onClick={() => handleStartChat(result.uid)} className="message-btn">Chat</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Groups Section */}
        {groups.length > 0 && (
          <div className="chats-section">
            <h3 className="section-title">Groups</h3>
            <div className="chats-list">
              {groups.map((group) => (
                <div key={group.id} className="chat-item group-item" onClick={() => navigate(`/group/${group.id}`)}>
                  <img src={group.photoURL || "https://via.placeholder.com/48"} alt={group.name} className="group-avatar" />
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

        {/* Private Chats Section */}
        <div className="chats-section">
          <h3 className="section-title">Private Chats</h3>
          <div className="chats-list">
            {chats.length === 0 ? (
              <div className="empty-state">
                <p>No private chats yet. Search for a user above!</p>
              </div>
            ) : (
              chats.map((chat) => (
                <Link key={chat.id} to={`/chat/${chat.id}`} className="chat-item">
                  <img src={chat.otherUser?.photoURL || "https://via.placeholder.com/48"} alt={chat.otherUser?.displayName || "User"} />
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