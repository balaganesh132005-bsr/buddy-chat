// src/pages/GroupChat.jsx - Modern Classic UI + Back Button
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import {
  sendGroupMessage,
  listenToGroupMessages,
  deleteGroupMessage,
  getGroupDetails,
  addMemberToGroup,
  removeMemberFromGroup,
  leaveGroup
} from "../services/groupService";
import { searchUserByUsername } from "../services/authService";
import { uploadGroupImage } from "../services/storageService";
import toast from "react-hot-toast";
import { FiArrowLeft, FiImage, FiSend, FiTrash2, FiUsers, FiSearch, FiUserPlus, FiX } from "react-icons/fi";
import "../styles/groupchat.css";

function GroupChat() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [group, setGroup] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load group details
  useEffect(() => {
    const loadGroup = async () => {
      try {
        const groupData = await getGroupDetails(groupId);
        
        // Check if user is member
        if (!groupData.members.includes(auth.currentUser.uid)) {
          toast.error("You are not a member of this group");
          navigate("/groups");
          return;
        }

        setGroup(groupData);
        setLoading(false);
      } catch (error) {
        toast.error("Failed to load group");
        navigate("/groups");
      }
    };

    loadGroup();
  }, [groupId, navigate]);

  // Listen to messages
  useEffect(() => {
    if (!groupId) return;

    const unsubscribe = listenToGroupMessages(groupId, (loadedMessages) => {
      setMessages(loadedMessages);
    });

    return () => unsubscribe?.();
  }, [groupId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    try {
      setSending(true);
      await sendGroupMessage(groupId, auth.currentUser.uid, {
        type: "text",
        text: inputValue
      });
      setInputValue("");
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSending(true);
      const mediaURL = await uploadGroupImage(groupId, auth.currentUser.uid, file);
      await sendGroupMessage(groupId, auth.currentUser.uid, {
        type: "image",
        mediaURL
      });
      fileInputRef.current.value = "";
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setSending(false);
    }
  };

  // Search for user to add
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
        setSearchResult(null); // Can't add yourself
      } else if (group?.members.includes(foundUser.uid)) {
        setSearchResult(null); // Already a member
      } else {
        setSearchResult(foundUser);
      }
    } catch (error) {
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  };

  // Add member to group
  const handleAddMember = async (userId) => {
    try {
      await addMemberToGroup(groupId, userId);
      toast.success("Member added!");
      setSearchQuery("");
      setSearchResult(null);
      
      // Reload group details
      const updatedGroup = await getGroupDetails(groupId);
      setGroup(updatedGroup);
    } catch (error) {
      toast.error("Failed to add member");
    }
  };

  // Remove member from group
  const handleRemoveMember = async (userId) => {
    if (window.confirm("Remove this member?")) {
      try {
        await removeMemberFromGroup(groupId, userId);
        toast.success("Member removed");
        
        // Reload group details
        const updatedGroup = await getGroupDetails(groupId);
        setGroup(updatedGroup);
      } catch (error) {
        toast.error("Failed to remove member");
      }
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm("Leave this group?")) {
      try {
        await leaveGroup(groupId, auth.currentUser.uid);
        toast.success("Left group");
        navigate("/groups");
      } catch (error) {
        toast.error("Failed to leave group");
      }
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteGroupMessage(groupId, messageId);
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  if (loading) {
    return <div className="groupchat-loading">Loading group...</div>;
  }

  const isGroupOwner = group?.ownerId === auth.currentUser.uid;

  return (
    <div className="groupchat-container-modern">
      {/* Header - Modern Glassmorphism */}
      <div className="groupchat-header-modern">
        <button onClick={() => navigate("/groups")} className="back-btn-modern">
          <FiArrowLeft size={22} />
        </button>
        
        <div className="group-info-header-modern">
          <p className="group-name-modern">{group?.name}</p>
          <p className="member-count-modern">{group?.members.length} members</p>
        </div>
        
        <button
          onClick={() => setShowMembers(!showMembers)}
          className="members-btn-modern"
        >
          <FiUsers size={20} />
        </button>
      </div>

      {/* Members Sidebar - Modern Style */}
      {showMembers && (
        <div className="members-sidebar-modern">
          <div className="sidebar-header-modern">
            <h3>Members ({group?.membersList.length})</h3>
            <button
              onClick={() => setShowMembers(false)}
              className="close-sidebar-modern"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Add Member Search */}
          {isGroupOwner && (
            <div className="add-member-section-modern">
              <label>Add Member</label>
              <div className="member-search-box-modern">
                <FiSearch size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchUser(e.target.value)}
                  placeholder="Search username..."
                />
              </div>

              {searching && <p className="search-hint">Searching...</p>}

              {searchResult && (
                <div
                  className="member-search-result-modern"
                  onClick={() => handleAddMember(searchResult.uid)}
                >
                  <img
                    src={searchResult.photoURL || "https://via.placeholder.com/32"}
                    alt={searchResult.displayName}
                  />
                  <div className="result-info">
                    <p className="result-name">{searchResult.displayName}</p>
                    <p className="result-handle">@{searchResult.username}</p>
                  </div>
                  <FiUserPlus size={16} />
                </div>
              )}
            </div>
          )}

          {/* Members List */}
          <div className="members-list-modern">
            {group?.membersList.map((member) => (
              <div key={member.uid} className="member-item-modern">
                <img
                  src={member.photoURL || "https://via.placeholder.com/40"}
                  alt={member.displayName}
                />
                <div className="member-info">
                  <p className="member-name">{member.displayName}</p>
                  <p className="member-handle">@{member.username}</p>
                </div>
                <div className="member-actions">
                  {group?.ownerId === member.uid && (
                    <span className="owner-badge">Owner</span>
                  )}
                  {isGroupOwner && group?.ownerId !== member.uid && (
                    <button
                      onClick={() => handleRemoveMember(member.uid)}
                      className="remove-btn"
                      title="Remove member"
                    >
                      <FiX size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Leave Group Button */}
          <button onClick={handleLeaveGroup} className="leave-btn-modern">
            Leave Group
          </button>
        </div>
      )}

      {/* Messages - Modern Bubbles */}
      <div className="messages-container-modern">
        {messages.length === 0 ? (
          <div className="no-messages-modern">
            <div className="empty-chat-icon">👥</div>
            <p>Start chatting in {group?.name}!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === auth.currentUser.uid;
            return (
              <div
                key={msg.id}
                className={`message-wrapper ${isMe ? "me" : "them"}`}
              >
                {!isMe && (
                  <img 
                    src={group?.membersList?.find(m => m.uid === msg.senderId)?.photoURL || "https://via.placeholder.com/30"} 
                    alt="avatar" 
                    className="msg-avatar"
                  />
                )}
                <div className={`message-bubble ${isMe ? "sent" : "received"}`}>
                  {msg.type === "text" ? (
                    <p className="message-text-modern">{msg.text}</p>
                  ) : (
                    <img src={msg.mediaURL} alt="Message" className="message-image-modern" />
                  )}
                  <span className="message-time-modern">
                    {msg.timestamp?.toDate?.()?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' }) || ""}
                  </span>
                  {isMe && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="delete-btn-modern"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Modern Floating Style */}
      <div className="input-container-modern">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="attach-btn-modern"
          disabled={sending}
        >
          <FiImage size={22} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          hidden
        />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Type a message..."
          className="input-modern"
          disabled={sending}
        />
        <button
          onClick={handleSendMessage}
          className="send-btn-modern"
          disabled={sending || !inputValue.trim()}
        >
          <FiSend size={20} />
        </button>
      </div>
    </div>
  );
}

export default GroupChat;