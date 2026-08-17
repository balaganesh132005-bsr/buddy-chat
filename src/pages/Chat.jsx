// src/pages/Chat.jsx - Chats List (Private + Groups) - FIXED IMPORTS
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { getUserChats } from "../services/chatService";
import { getUserGroups } from "../services/groupService"; // ✅ FIXED: Added this import
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
  FiUsers,
  FiMessageCircle, // ✅ FIXED: Added this import
  FiArrowLeft      // ✅ FIXED: Added this import
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

        // Fetch private chats
        const userChats = await getUserChats(currentUser.uid);
        setChats(userChats);

        // Fetch groups
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
          <Link to="/" className="nav-item">
            <FiHome size={20} />
            <span>Home</span>
          </Link>
          <Link to="/chats" className="nav-item active">
            <FiMessageCircle size={20} /> {/* ✅ Now works */}
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

      {/* Main Content */}
      <div className="main-content">
        <div className="content-header">
          <button onClick={() => navigate("/")} className="back-btn-header">
            <FiArrowLeft size={20} /> {/* ✅ Now works */}
          </button>
          <h2>Chats</h2>
          <button 
            onClick={() => navigate("/groups")} 
            className="create-btn"
          >
            <FiPlus size={20} /> New Group
          </button>
        </div>

        {/* Search */}
        <div className="search-section">
          <div className="search-box">
            <FiSearch size={20} />
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
                  <img
                    src={result.photoURL || "https://via.placeholder.com/40"}
                    alt={result.displayName}
                  />
                  <div className="result-info">
                    <p className="result-name">{result.displayName}</p>
                    <p className="result-handle">@{result.username}</p>
                  </div>
                  <button
                    onClick={() => handleStartChat(result.uid)}
                    className="message-btn"
                  >
                    Message
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Groups Section First */}
        {groups.length > 0 && (
          <div className="groups-section-chats">
            <h3 className="section-label">Groups</h3>
            <div className="groups-chats-list">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="chat-item group-item"
                  onClick={() => navigate(`/group/${group.id}`)}
                >
                  <img
                    src={group.photoURL || "https://via.placeholder.com/50"}
                    alt={group.name}
                    className="group-avatar"
                  />
                  <div className="chat-info">
                    <p className="chat-name">{group.name}</p>
                    <p className="chat-preview">{group.members?.length || 0} members</p>
                  </div>
                  <span className="chat-time">
                    {group.lastMessage || "Start chatting..."}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Private Chats Section */}
        <div className="private-chats-section">
          <h3 className="section-label">Private Chats</h3>
          <div className="chats-list">
            {chats.length === 0 ? (
              <div className="empty-state">
                <p>No private chats yet. Search for a user above!</p>
              </div>
            ) : (
              chats.map((chat) => (
                <Link
                  key={chat.id}
                  to={`/chat/${chat.id}`}
                  className="chat-item"
                >
                  <img
                    src={
                      chat.otherUser?.photoURL ||
                      "https://via.placeholder.com/50"
                    }
                    alt={chat.otherUser?.displayName || "User"}
                  />
                  <div className="chat-info">
                    <p className="chat-name">
                      {chat.otherUser?.displayName || "Unknown"}
                    </p>
                    <p className="chat-preview">{chat.lastMessage || "Start a chat..."}</p>
                  </div>
                  <span className="chat-time">
                    {chat.updatedAt?.toDate?.()?.toLocaleDateString?.() || ""}
                  </span>
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