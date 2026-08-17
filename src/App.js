// src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./config/firebase";
import { Toaster } from "react-hot-toast";

import Login from "./pages/Login";
import CreateUsername from "./pages/CreateUsername";
import Home from "./pages/Home";
import Chats from "./pages/Chat";           // 👈 Chats List Page
import IndividualChat from "./pages/IndividualChat"; // 👈 Individual Chat Page
import Stories from "./pages/Stories";
import Groups from "./pages/Groups";
import GroupChat from "./pages/GroupChat";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

import "./App.css";

// Loading Component with Animation
function LoadingScreen() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white"
    }}>
      <div style={{
        width: "60px",
        height: "60px",
        border: "6px solid rgba(255, 255, 255, 0.3)",
        borderTop: "6px solid white",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: "20px"
      }}></div>
      <h2 style={{ fontSize: "24px", fontWeight: "600" }}>BuddyChat</h2>
      <p style={{ fontSize: "14px", opacity: "0.8" }}>Loading...</p>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [hasUsername, setHasUsername] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists() && userDoc.data().username) {
            setHasUsername(true);
          } else {
            setHasUsername(false);
          }
        } catch (error) {
          console.error("Error checking username:", error);
          setHasUsername(false);
        }
      } else {
        setUser(null);
        setHasUsername(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {!user && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}

        {user && !hasUsername && (
          <>
            <Route path="/create-username" element={<CreateUsername />} />
            <Route path="*" element={<Navigate to="/create-username" replace />} />
          </>
        )}

        {user && hasUsername && (
          <>
            <Route path="/" element={<Home />} />
            
            {/* 👇 Chats List Page */}
            <Route path="/chats" element={<Chats />} />
            
            {/* 👇 Individual Chat Page - இதான் உங்க கேட்ட 2 வரிகள் */}
            <Route path="/chat/:chatId" element={<IndividualChat />} />
            
            <Route path="/stories" element={<Stories />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/group/:groupId" element={<GroupChat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;