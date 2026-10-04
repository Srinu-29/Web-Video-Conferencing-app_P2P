import React, { useRef, useEffect } from "react";
import { IconButton } from "@mui/material";
import SignalCellularAltIcon from "@mui/icons-material/SignalCellularAlt";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import "./ParticipantTile.css";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", // blue
  "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", // purple
  "linear-gradient(135deg, #ec4899 0%, #be185d 100%)", // pink
  "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)", // amber
  "linear-gradient(135deg, #10b981 0%, #047857 100%)", // emerald
  "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)", // cyan
  "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", // indigo
];

function getAvatarBackground(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function ParticipantTile({
  participant,
  isSpotlight = false,
  isSpotlightCard = false,
  isMini = false,
  muteAudio = false,
  onSpotlight,
  className = "",
  style = {},
}) {
  const videoRef = useRef(null);

  const {
    id,
    name = "Guest",
    isMe = false,
    isMuted = false,
    isVideoOff = false,
  } = participant || {};

  // Safely bind media stream & synchronize muted state on the DOM element
  useEffect(() => {
    if (videoRef.current) {
      if (participant?.stream) {
        if (videoRef.current.srcObject !== participant.stream) {
          videoRef.current.srcObject = participant.stream;
          videoRef.current.play().catch(() => {});
        }
      } else {
        videoRef.current.srcObject = null;
      }
      videoRef.current.muted = isMe || muteAudio;
    }
  }, [participant?.stream, isMe, muteAudio]);

  const initialLetter = name.trim().charAt(0).toUpperCase() || "?";
  const avatarBg = getAvatarBackground(name);

  return (
    <div
      className={`participant-tile ${
        isSpotlightCard ? "is-active-spotlight" : ""
      } ${isSpotlight ? "is-spotlight" : ""} ${isMini ? "mini" : ""} ${className}`}
      style={style}
      onClick={() => onSpotlight && onSpotlight(id)}
    >
      {/* Video Element: displays actual live webcam feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMe || muteAudio} // Mute local or duplicate audio
        className={`tile-video ${isMe ? "mirrored" : ""} ${
          isVideoOff ? "hidden" : ""
        }`}
      />

      {/* Camera Off Fallback: displays initial letter avatar when video is off */}
      {isVideoOff && (
        <div className="tile-camera-off">
          <div className="tile-avatar-circle" style={{ background: avatarBg }}>
            {initialLetter}
          </div>
        </div>
      )}

      {/* Network Signal Indicator (Top-left on main stage) */}
      {!isMini && (
        <div className="tile-signal-badge" title="Strong connection">
          <SignalCellularAltIcon sx={{ fontSize: 16 }} />
        </div>
      )}

      {/* Bottom Left Name Tag Pill */}
      <div className="tile-name-pill">
        {isMuted ? (
          <MicOffIcon sx={{ fontSize: isMini ? 12 : 14, color: "#ef4444" }} />
        ) : (
          <span className="tile-active-dot" />
        )}
        <span>{isMe ? `${name} (You)` : name}</span>
      </div>

      {/* Bottom Right Dual Status Icons (Microphone & Camera on main stage) */}
      {!isMini && (
        <div className="tile-status-badges-group">
          <div
            className="tile-status-pill"
            title={isMuted ? "Microphone muted" : "Microphone active"}
          >
            {isMuted ? (
              <MicOffIcon sx={{ fontSize: 18, color: "#ffffff" }} />
            ) : (
              <MicIcon sx={{ fontSize: 18, color: "#ffffff" }} />
            )}
          </div>
          <div
            className="tile-status-pill"
            title={isVideoOff ? "Camera off" : "Camera active"}
          >
            {isVideoOff ? (
              <VideocamOffIcon sx={{ fontSize: 18, color: "#ffffff" }} />
            ) : (
              <VideocamIcon sx={{ fontSize: 18, color: "#ffffff" }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ParticipantTile;
