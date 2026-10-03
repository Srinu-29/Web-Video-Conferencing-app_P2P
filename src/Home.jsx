import React, { useState } from "react";
import {
  Button,
  Typography,
  TextField,
  InputAdornment,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import BoltIcon from "@mui/icons-material/Bolt";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import MicIcon from "@mui/icons-material/Mic";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import SendIcon from "@mui/icons-material/Send";
import "./Home.css";

const generateRoomId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => sessionStorage.getItem("userName") || "");
  const [errorText, setErrorText] = useState("");

  const handleCreateMeeting = (e) => {
    if (e) e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorText("Please enter your name.");
      return;
    }

    setErrorText("");

    // Save name to sessionStorage so Room component picks it up immediately
    sessionStorage.setItem("userName", trimmedName);

    // Generate new unique room ID and navigate
    const newRoomId = generateRoomId();
    navigate(`/room/${newRoomId}`);
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (errorText) {
      setErrorText("");
    }
  };

  return (
    <div className="meetflow-home-container">
      {/* Background Glows & Ambience */}
      <div className="meetflow-ambient-glow-top" />
      <div className="meetflow-ambient-glow-bottom-left" />
      <div className="meetflow-ambient-glow-bottom-right" />

      {/* Background SVG Waves */}
      <svg
        className="meetflow-bg-waves"
        viewBox="0 0 1440 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M0,160 C320,300 480,40 800,180 C1120,320 1280,100 1440,200 L1440,280 L0,280 Z"
          fill="url(#wave-gradient-1)"
          opacity="0.35"
        />
        <path
          d="M0,220 C360,100 640,300 1000,160 C1240,60 1360,180 1440,240 L1440,280 L0,280 Z"
          fill="url(#wave-gradient-2)"
          opacity="0.5"
        />
        <defs>
          <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="wave-gradient-2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="60%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
        </defs>
      </svg>

      {/* Decorative Left Video Conference Window */}
      <aside className="meetflow-decorative-left" aria-hidden="true">
        <div className="decorative-window-header">
          <span className="window-dot dot-red" />
          <span className="window-dot dot-yellow" />
          <span className="window-dot dot-green" />
        </div>
        <div className="decorative-video-body">
          <div className="decorative-sidebar-controls">
            <MicIcon sx={{ fontSize: 16 }} />
            <VideocamRoundedIcon sx={{ fontSize: 16 }} />
            <MoreHorizIcon sx={{ fontSize: 16 }} />
          </div>
          <div className="decorative-grid-2x2">
            <div className="decorative-participant-tile active-speaker">
              <div className="avatar-silhouette avatar-user-1">S</div>
            </div>
            <div className="decorative-participant-tile">
              <div className="avatar-silhouette avatar-user-2">P</div>
            </div>
            <div className="decorative-participant-tile">
              <div className="avatar-silhouette avatar-user-3">R</div>
            </div>
            <div className="decorative-participant-tile">
              <div className="avatar-silhouette avatar-user-4">A</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Decorative Right Chat Window */}
      <aside className="meetflow-decorative-right" aria-hidden="true">
        <div className="decorative-chat-bubble-floating">
          <span className="chat-dot" />
          <span className="chat-dot" />
          <span className="chat-dot" />
        </div>
        <div className="decorative-chat-rows">
          <div className="decorative-chat-row">
            <div className="avatar-silhouette avatar-user-2" style={{ width: 30, height: 30, fontSize: "0.75rem" }}>
              P
            </div>
            <div className="decorative-chat-lines">
              <div className="chat-line-long" />
              <div className="chat-line-short" />
            </div>
          </div>
          <div className="decorative-chat-row">
            <div className="avatar-silhouette avatar-user-1" style={{ width: 30, height: 30, fontSize: "0.75rem" }}>
              R
            </div>
            <div className="decorative-chat-lines">
              <div className="chat-line-long" style={{ width: "80%" }} />
            </div>
          </div>
          <div className="decorative-chat-row">
            <div className="avatar-silhouette avatar-user-3" style={{ width: 30, height: 30, fontSize: "0.75rem" }}>
              A
            </div>
            <div className="decorative-chat-lines">
              <div className="chat-line-long" style={{ width: "95%" }} />
              <div className="chat-line-short" style={{ width: "45%" }} />
            </div>
          </div>
        </div>
        <div className="decorative-chat-input-preview">
          <SentimentSatisfiedAltIcon sx={{ fontSize: 17, color: "#64748b" }} />
          <div className="chat-send-icon-preview">
            <SendIcon sx={{ fontSize: 13 }} />
          </div>
        </div>
      </aside>

      {/* Center Section: Branding & Creation Card */}
      <main className="meetflow-center-content">
        {/* App Logo */}
        <div className="meetflow-logo-badge">
          <VideocamRoundedIcon sx={{ fontSize: 40 }} />
        </div>

        {/* Heading & Subtitle */}
        <Typography variant="h1" className="meetflow-title">
          <span className="meetflow-title-meet">Meet</span>
          <span className="meetflow-title-flow">Flow</span>
        </Typography>

        <Typography variant="body1" className="meetflow-subtitle">
          Start a new meeting and connect with people, anytime, anywhere.
        </Typography>

        {/* Form Glass Card */}
        <form onSubmit={handleCreateMeeting} className="meetflow-glass-card" noValidate>
          <label htmlFor="user-name-input" className="card-field-label">
            Your name
          </label>

          <TextField
            id="user-name-input"
            fullWidth
            placeholder="Enter your name"
            variant="outlined"
            className="meetflow-name-input"
            value={name}
            onChange={handleNameChange}
            error={Boolean(errorText)}
            helperText={errorText}
            autoComplete="name"
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlinedIcon sx={{ color: "#94a3b8", fontSize: 22 }} />
                  </InputAdornment>
                ),
              },
              formHelperText: {
                sx: { color: "#f87171", fontSize: "0.82rem", mt: 0.8, ml: 0.5 },
              },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            className="meetflow-create-btn"
            startIcon={<VideocamRoundedIcon sx={{ fontSize: 22 }} />}
          >
            Create New Meeting
          </Button>
        </form>
      </main>

      {/* Bottom Features Bar */}
      <footer className="meetflow-features-row">
        {/* Feature 1: Connect */}
        <div className="meetflow-feature-item">
          <div className="feature-icon-circle icon-circle-blue">
            <GroupsOutlinedIcon sx={{ fontSize: 22 }} />
          </div>
          <div className="feature-text-block">
            <span className="feature-title">Connect</span>
            <span className="feature-desc">Meet with anyone</span>
          </div>
        </div>

        {/* Feature 2: Simple */}
        <div className="meetflow-feature-item">
          <div className="feature-icon-circle icon-circle-purple">
            <BoltIcon sx={{ fontSize: 22 }} />
          </div>
          <div className="feature-text-block">
            <span className="feature-title">Simple</span>
            <span className="feature-desc">Start instantly</span>
          </div>
        </div>

        {/* Feature 3: Reliable */}
        <div className="meetflow-feature-item">
          <div className="feature-icon-circle icon-circle-teal">
            <ShieldOutlinedIcon sx={{ fontSize: 22 }} />
          </div>
          <div className="feature-text-block">
            <span className="feature-title">Reliable</span>
            <span className="feature-desc">Smooth & secure</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
