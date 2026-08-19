// src/pages/Groups.jsx - Clean Search Layout
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { getUserGroups, createGroup } from "../services/groupService";
import { searchUserByUsername } from "../services/authService";
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { 
  FiPlus, 
  FiX, 
  FiSearch, 
  FiUserPlus, 
  FiHome,
  FiMessageCircle,
  FiImage,
  FiUser,
  FiSettings,
  FiLogOut,
  FiArrowLeft
} from "react-icons/fi";
import "../styles/home.css";
import "../styles/groups.css";

function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [user, setUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        setUser({ uid: currentUser.uid, ...userDoc.data() });

        const userGroups = await getUserGroups(currentUser.uid);
        setGroups(userGroups);
      } catch (error) {
        toast.error("Failed to load groups");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearchUser = async (value) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setSearchResult(null);
      return;
    }
    try {
      setSearching(true);
      const foundUser = await searchUserByUsername(value.trim());
      if (!foundUser) {
        setSearchResult(null);
      } else if (foundUser.uid === auth.currentUser.uid) {
        setSearchResult(null);
      } else if (selectedMembers.some((m) => m.uid === foundUser.uid)) {
        setSearchResult(null);
      } else {
        setSearchResult(foundUser);
      }
    } catch (error) {
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = (user) => {
    setSelectedMembers((prev) => [...prev, user]);
    setSearchQuery("");
    setSearchResult(null);
  };

  const handleRemoveMember = (uid) => {
    setSelectedMembers((prev) => prev.filter((m) => m.uid !== uid));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name required");
      return;
    }
    try {
      setCreating(true);
      const memberIds = selectedMembers.map((m) => m.uid);
      const groupId = await createGroup(groupName, memberIds, auth.currentUser.uid);
      toast.success("Group created!");
      setGroupName("");
      setSelectedMembers([]);
      setSearchQuery("");
      setSearchResult(null);
      setShowCreate(false);
      const userGroups = await getUserGroups(auth.currentUser.uid);
      setGroups(userGroups);
      navigate(`/group/${groupId}`);
    } catch (error) {
      toast.error(error.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    setShowCreate(false);
    setGroupName("");
    setSelectedMembers([]);
    setSearchQuery("");
    setSearchResult(null);
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
    return <div className="loading">Loading groups...</div>;
  }

  return (
    <div className="groups-page-container">
      
      {/* DESKTOP SIDEBAR */}
      <div className="desktop-sidebar">
        <h2>BuddyChat</h2>
        <nav className="desktop-nav">
          <Link to="/" className="desktop-nav-item">
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
      <div className="main-content-groups">
        <div className="groups-header">
          <div className="groups-title-area">
            <button onClick={() => navigate("/")} className="back-btn-groups"><FiArrowLeft size={20} /></button>
            <h2>Groups</h2>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="create-group-btn">
            <FiPlus size={20} /> New Group
          </button>
        </div>

        {showCreate && (
          <div className="create-group-form">
            <div className="form-group">
              <label>Group Name</label>
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name" disabled={creating} />
            </div>
            <div className="form-group">
              <label>Add Members</label>
              <div className="member-search-box">
                <FiSearch size={16} />
                <input type="text" value={searchQuery} onChange={(e) => handleSearchUser(e.target.value)} placeholder="Search username..." disabled={creating} />
              </div>
              {searching && <p className="search-hint">Searching...</p>}
              {searchResult && (
                <div className="member-search-result" onClick={() => handleAddMember(searchResult)}>
                  <img src={searchResult.photoURL || "https://via.placeholder.com/40"} alt={searchResult.displayName} />
                  <div className="result-info">
                    <p className="result-name">{searchResult.displayName}</p>
                    <p className="result-handle">@{searchResult.username}</p>
                  </div>
                  <FiUserPlus size={18} />
                </div>
              )}
              {selectedMembers.length > 0 && (
                <div className="selected-members">
                  {selectedMembers.map((m) => (
                    <div key={m.uid} className="selected-member-chip">
                      <img src={m.photoURL || "https://via.placeholder.com/24"} alt={m.displayName} />
                      <span>@{m.username}</span>
                      <button type="button" onClick={() => handleRemoveMember(m.uid)} disabled={creating}><FiX size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-actions">
              <button onClick={handleCreateGroup} disabled={creating || !groupName.trim()} className="btn-primary">{creating ? "Creating..." : "Create Group"}</button>
              <button onClick={handleCancel} disabled={creating} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        <div className="groups-list">
          {groups.length === 0 ? (
            <p className="no-groups">No groups yet. Create one!</p>
          ) : (
            groups.map((group) => (
              <div key={group.id} onClick={() => navigate(`/group/${group.id}`)} className="group-item">
                <img src={group.photoURL || "https://via.placeholder.com/50"} alt={group.name} />
                <div className="group-info">
                  <p className="group-name">{group.name}</p>
                  <p className="group-members">{group.members.length} members</p>
                </div>
                <span className="group-last-msg">{group.lastMessage || "Start chatting..."}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Groups;