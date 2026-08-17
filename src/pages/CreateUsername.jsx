// src/pages/CreateUsername.jsx
import React, { useState, useEffect } from "react";
import { auth } from "../config/firebase";
import { checkUsernameAvailability, createUsername } from "../services/authService";
import toast from "react-hot-toast";
import { FiCheck, FiX, FiLoader } from "react-icons/fi";
import "../styles/auth.css";

function CreateUsername() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);

  useEffect(() => {
    if (username.length < 3) {
      setAvailable(null);
      return;
    }

    const checkAvailability = async () => {
      setChecking(true);
      try {
        const isAvailable = await checkUsernameAvailability(username);
        setAvailable(isAvailable);
      } catch (error) {
        setAvailable(null);
      }
      setChecking(false);
    };

    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleCreateUsername = async () => {
    if (!username || username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    if (!available) {
      toast.error("Username not available");
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;

      if (!user) {
        toast.error("User not authenticated");
        setLoading(false);
        return;
      }

      // Always ensure displayName has a real value
      const displayName =
        user.displayName && user.displayName.trim() !== ""
          ? user.displayName
          : username.charAt(0).toUpperCase() + username.slice(1);

      await createUsername(user.uid, username, {
        email: user.email || "",
        displayName: displayName,
        photoURL: user.photoURL || ""
      });

      toast.success("Username created successfully!");

      // Full page reload so App.jsx re-checks auth + username state fresh
      setTimeout(() => {
        window.location.href = "/";
      }, 800);
    } catch (error) {
      toast.error(error.message || "Failed to create username");
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && available && !loading) {
      handleCreateUsername();
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>Create Username</h1>
          <p>Choose your unique username</p>
        </div>

        <div className="auth-content">
          <div className="username-input-group">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              onKeyPress={handleKeyPress}
              placeholder="Enter username"
              className="username-input"
              disabled={loading}
              minLength={3}
            />

            <div className="username-status">
              {checking && <FiLoader className="spinning" size={20} />}
              {!checking && available === true && (
                <FiCheck size={20} className="available" />
              )}
              {!checking && available === false && (
                <FiX size={20} className="unavailable" />
              )}
            </div>
          </div>

          {available !== null && (
            <p className={available ? "available-text" : "unavailable-text"}>
              {available ? "✓ Username available" : "✗ Username taken"}
            </p>
          )}

          <button
            onClick={handleCreateUsername}
            disabled={loading || !available || username.length < 3}
            className="auth-submit-btn"
          >
            {loading ? "Creating..." : "Create Username"}
          </button>

          <p className="auth-footer">
            Username must be 3-20 characters, alphanumeric only
          </p>
        </div>
      </div>
    </div>
  );
}

export default CreateUsername;