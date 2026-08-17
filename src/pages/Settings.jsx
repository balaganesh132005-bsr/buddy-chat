import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { logout, deleteAccount } from "../services/authService";
import toast from "react-hot-toast";
import { FiArrowLeft, FiToggleRight, FiToggleLeft, FiLogOut, FiTrash2 } from "react-icons/fi";
import "../styles/settings.css";

function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    notifications: true,
    storyPrivacy: "public"
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        setUser(userDoc.data());
      } catch (error) {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      toast.success("Logged out");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure? This cannot be undone!")) return;

    try {
      await deleteAccount(auth.currentUser.uid);
      navigate("/login");
      toast.success("Account deleted");
    } catch (error) {
      toast.error(error.message || "Failed to delete account");
    }
  };

  if (loading) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button onClick={() => navigate("/")} className="back-btn">
          <FiArrowLeft size={20} />
        </button>
        <h2>Settings</h2>
      </div>

      <div className="settings-content">
        {/* Account Settings */}
        <div className="settings-section">
          <h3>Account</h3>
          <div className="setting-item">
            <div>
              <p className="setting-label">Email</p>
              <p className="setting-value">{user?.email}</p>
            </div>
          </div>
          <div className="setting-item">
            <div>
              <p className="setting-label">Username</p>
              <p className="setting-value">@{user?.username}</p>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="settings-section">
          <h3>Privacy</h3>
          <div className="setting-item">
            <div>
              <p className="setting-label">Story Privacy</p>
              <p className="setting-value">{settings.storyPrivacy}</p>
            </div>
            <select
              value={settings.storyPrivacy}
              onChange={(e) =>
                setSettings({ ...settings, storyPrivacy: e.target.value })
              }
              className="setting-select"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="settings-section">
          <h3>Notifications</h3>
          <div className="setting-item">
            <div>
              <p className="setting-label">Message Notifications</p>
            </div>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  notifications: !settings.notifications
                })
              }
              className="toggle-btn"
            >
              {settings.notifications ? (
                <FiToggleRight size={24} />
              ) : (
                <FiToggleLeft size={24} />
              )}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="settings-section danger">
          <h3>Danger Zone</h3>
          <button onClick={handleLogout} className="logout-btn">
            <FiLogOut size={18} /> Logout
          </button>
          <button onClick={handleDeleteAccount} className="delete-btn">
            <FiTrash2 size={18} /> Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;