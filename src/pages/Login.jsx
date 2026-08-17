// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { googleLogin } from "../services/authService";
import toast from "react-hot-toast";
import { FiLogIn } from "react-icons/fi";
import "../styles/auth.css";

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const user = await googleLogin();
      
      if (user) {
        // Check if user has username
        const { checkUserExists } = await import("../services/authService");
        const exists = await checkUserExists(user.uid);
        
        if (exists) {
          navigate("/");
        } else {
          navigate("/create-username");
        }
      }
    } catch (error) {
      toast.error(error.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>SocialChat</h1>
          <p>Connect with everyone</p>
        </div>

        <div className="auth-content">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="google-login-btn"
          >
            <FiLogIn size={20} />
            {loading ? "Logging in..." : "Continue with Google"}
          </button>

          <p className="auth-footer">
            By logging in, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;