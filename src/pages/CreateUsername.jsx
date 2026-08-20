// src/pages/CreateUsername.jsx - FIXED VERSION
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
  const [errorMessage, setErrorMessage] = useState("");

  // ✅ FIXED: Better input validation
  const validateUsername = (input) => {
    const cleanInput = input.trim().toLowerCase();

    // Check length
    if (cleanInput.length < 3) {
      setErrorMessage("Minimum 3 characters required");
      return false;
    }

    if (cleanInput.length > 20) {
      setErrorMessage("Maximum 20 characters allowed");
      return false;
    }

    // Check if alphanumeric and underscore only
    if (!/^[a-z0-9_]+$/.test(cleanInput)) {
      setErrorMessage("Only letters, numbers, and underscore allowed");
      return false;
    }

    setErrorMessage("");
    return true;
  };

  useEffect(() => {
    if (username.length < 3) {
      setAvailable(null);
      setErrorMessage("");
      return;
    }

    // Validate input first
    if (!validateUsername(username)) {
      setAvailable(false);
      return;
    }

    const checkAvailability = async () => {
      setChecking(true);
      try {
        const isAvailable = await checkUsernameAvailability(username);
        setAvailable(isAvailable);
        if (!isAvailable) {
          setErrorMessage("Username already taken");
        } else {
          setErrorMessage("");
        }
      } catch (error) {
        console.error("Error checking username:", error);
        setAvailable(false);
        setErrorMessage("Error checking availability");
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

      setTimeout(() => {
        window.location.href = "/";
      }, 800);
    } catch (error) {
      console.error("Error creating username:", error);
      toast.error(error.message || "Failed to create username");
      
      // ✅ FIXED: If error is "no longer available", refresh check
      if (error.message.includes("no longer available")) {
        setAvailable(false);
        setErrorMessage("Username was taken by someone else");
      }
      
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && available && !loading && !checking) {
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
              maxLength={20}
            />

            <div className="username-status">
              {checking && <FiLoader className="spinning" size={20} />}
              {!checking && available === true && (
                <FiCheck size={20} className="available" />
              )}
              {!checking && available === false && username.length >= 3 && (
                <FiX size={20} className="unavailable" />
              )}
            </div>
          </div>

          {/* ✅ FIXED: Better error/status messages */}
          {errorMessage && (
            <p className="unavailable-text">✗ {errorMessage}</p>
          )}

          {available !== null && !errorMessage && (
            <p className={available ? "available-text" : "unavailable-text"}>
              {available ? "✓ Username available" : "✗ Username taken"}
            </p>
          )}

          <button
            onClick={handleCreateUsername}
            disabled={loading || !available || username.length < 3 || checking}
            className="auth-submit-btn"
          >
            {loading ? "Creating..." : checking ? "Checking..." : "Create Username"}
          </button>

          <p className="auth-footer">
            3-20 characters • Letters, numbers, underscore only
          </p>
        </div>
      </div>
    </div>
  );
}

export default CreateUsername;