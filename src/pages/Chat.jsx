// src/pages/Chats.jsx - Mobile Responsive Fix (CSS Classes Fixed)
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
  FiUsers,
  FiMessageCircle,
  FiArrowLeft
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
    return (
      <div className="home-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Mobile Top Bar */}
      <div className="mobile-top-bar">
        <div className="mobile-brand">
          <h1>BuddyChat</h1>
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

      {/* Main Content - Chats */}
      <div className="main-content-mobile">
        <div className="content-header">
          <h2>Chats</h2>
          <button onClick={() => navigate("/groups")} className="create-btn">
            <FiPlus size={20} /> New Group
          </button>
        </div>

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
          <div className="groups-section-chats">
            <h3 className="section-label">Groups</h3>
            <div className="groups-chats-list">
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

        <div className="private-chats-section">
          <h3 className="section-label">Private Chats</h3>
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