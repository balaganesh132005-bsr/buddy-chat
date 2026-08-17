// src/pages/IndividualChat.jsx - Modern Classic Chat UI
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  sendMessage,
  listenToMessages,
  deleteMessage,
  markMessageAsRead
} from "../services/chatService";
import { uploadChatImage } from "../services/storageService";
import toast from "react-hot-toast";
import { FiArrowLeft, FiImage, FiSend, FiTrash2, FiMoreVertical } from "react-icons/fi";
import "../styles/chat.css";

function IndividualChat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchChatDetails = async () => {
      try {
        const chatRef = doc(db, "chats", chatId);
        const chatDoc = await getDoc(chatRef);

        if (!chatDoc.exists()) {
          toast.error("Chat not found");
          navigate("/chats");
          return;
        }

        const participants = chatDoc.data().participants;
        const otherUserId = participants.find(id => id !== auth.currentUser.uid);

        if (!otherUserId) {
          toast.error("Invalid chat");
          navigate("/chats");
          return;
        }

        const userRef = doc(db, "users", otherUserId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          setOtherUser({ uid: otherUserId, ...userDoc.data() });
        }

        setLoading(false);
      } catch (error) {
        toast.error("Failed to load chat");
        navigate("/chats");
      }
    };

    fetchChatDetails();
  }, [chatId, navigate]);

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = listenToMessages(chatId, (loadedMessages) => {
      setMessages(loadedMessages);
      
      loadedMessages.forEach(msg => {
        if (msg.senderId !== auth.currentUser.uid) {
          markMessageAsRead(chatId, msg.id, auth.currentUser.uid);
        }
      });
    });

    return () => unsubscribe?.();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && inputValue.trim().length === 0) return;

    try {
      setSending(true);
      await sendMessage(chatId, auth.currentUser.uid, {
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
      const mediaURL = await uploadChatImage(chatId, auth.currentUser.uid, file);
      await sendMessage(chatId, auth.currentUser.uid, {
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

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(chatId, messageId);
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  if (loading) {
    return <div className="chat-loading">Loading chat...</div>;
  }

  return (
    <div className="chat-container-modern">
      {/* Header - Modern Glassmorphism */}
      <div className="chat-header-modern">
        <button onClick={() => navigate("/chats")} className="back-btn-modern">
          <FiArrowLeft size={22} />
        </button>
        <div className="chat-user-info-modern">
          <div className="user-avatar-wrapper">
            <img
              src={otherUser?.photoURL || "https://via.placeholder.com/40"}
              alt={otherUser?.displayName}
              className="user-avatar-modern"
            />
            <span className="online-indicator"></span>
          </div>
          <div>
            <p className="chat-user-name-modern">{otherUser?.displayName}</p>
            <p className="chat-user-handle-modern">@{otherUser?.username}</p>
          </div>
        </div>
        <button className="more-btn-modern">
          <FiMoreVertical size={20} />
        </button>
      </div>

      {/* Messages - Clean Bubbles */}
      <div className="messages-container-modern">
        {messages.length === 0 ? (
          <div className="no-messages-modern">
            <div className="empty-chat-icon">💬</div>
            <p>Start a conversation with {otherUser?.displayName}</p>
            <span className="sub-text">Say hi!</span>
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
                    src={otherUser?.photoURL || "https://via.placeholder.com/30"} 
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

export default IndividualChat;