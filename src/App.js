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
import Chats from "./pages/Chats"; // ✅ Chat list page
import Chat from "./pages/Chat";   // ✅ Individual chat page
import Stories from "./pages/Stories";
import Groups from "./pages/Groups";
import GroupChat from "./pages/GroupChat";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

import "./App.css";

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
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "18px",
        color: "#667eea"
      }}>
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Not logged in -> Login page */}
        {!user && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}

        {/* Logged in but no username -> Create Username */}
        {user && !hasUsername && (
          <>
            <Route path="/create-username" element={<CreateUsername />} />
            <Route path="*" element={<Navigate to="/create-username" replace />} />
          </>
        )}

        {/* Logged in with username -> Full app */}
        {user && hasUsername && (
          <>
            <Route path="/" element={<Home />} />
            
            {/* ✅ CHATS LIST PAGE */}
            <Route path="/chats" element={<Chats />} />
            
            {/* ✅ INDIVIDUAL CHAT PAGE */}
            <Route path="/chat/:chatId" element={<Chat />} />
            
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