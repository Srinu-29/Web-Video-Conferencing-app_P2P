import React, { useState } from "react";
import {
  IconButton,
  Button,
  Tooltip,
  Badge,
  Popover,
  Menu,
  MenuItem,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import PeopleIcon from "@mui/icons-material/People";
import ChatIcon from "@mui/icons-material/Chat";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CallEndIcon from "@mui/icons-material/CallEnd";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import "./MeetingControls.css";

const REACTION_EMOJIS = ["👍", "👏", "❤️", "😂", "😮", "🎉"];

function fallbackCopyText(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand("copy");
  } catch (e) {
    console.warn("Clipboard fallback copy failed:", e);
  }
  document.body.removeChild(textArea);
}

function MeetingControls({
  isMuted = false,
  isVideoOff = false,
  isChatOpen = false,
  isParticipantsOpen = false,
  unreadChatCount = 0,
  participantCount = 1,
  onToggleAudio,
  onToggleVideo,
  onToggleChat,
  onToggleParticipants,
  onSendReaction,
  onEditName,
  onLeaveMeeting,
  themeMode = "dark",
}) {
  const [reactionsAnchor, setReactionsAnchor] = useState(null);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href).catch(() => {
        fallbackCopyText(window.location.href);
      });
    } else {
      fallbackCopyText(window.location.href);
    }
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setMoreAnchor(null);
    }, 1200);
  };

  return (
    <footer
      className={`meeting-controls-bar ${themeMode === "light" ? "light-theme" : ""}`}
    >
      <div className="controls-inner-dock">
        {/* Mute Control */}
        <div className="control-item">
          <Tooltip title={isMuted ? "Unmute (Mic)" : "Mute (Mic)"} arrow>
            <IconButton
              className={`control-btn ${isMuted ? "is-danger-active" : ""}`}
              onClick={onToggleAudio}
            >
              {isMuted ? <MicOffIcon /> : <MicIcon />}
            </IconButton>
          </Tooltip>
        </div>

        {/* Video Control */}
        <div className="control-item">
          <Tooltip title={isVideoOff ? "Start Video" : "Stop Video"} arrow>
            <IconButton
              className={`control-btn ${isVideoOff ? "is-danger-active" : ""}`}
              onClick={onToggleVideo}
            >
              {isVideoOff ? <VideocamOffIcon /> : <VideocamIcon />}
            </IconButton>
          </Tooltip>
        </div>

        {/* Participants Control */}
        <div className="control-item">
          <Tooltip title="Participants" arrow>
            <IconButton
              className={`control-btn ${isParticipantsOpen ? "is-active" : ""}`}
              onClick={onToggleParticipants}
            >
              <Badge badgeContent={participantCount} color="primary" max={99}>
                <PeopleIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        </div>

        {/* Chat Control */}
        <div className="control-item">
          <Tooltip title="Chat" arrow>
            <IconButton
              className={`control-btn ${isChatOpen ? "is-active" : ""}`}
              onClick={onToggleChat}
            >
              <Badge badgeContent={unreadChatCount} color="error" max={99}>
                <ChatIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        </div>

        {/* Reactions Control */}
        <div className="control-item">
          <Tooltip title="Reactions" arrow>
            <IconButton
              className="control-btn"
              onClick={(e) => setReactionsAnchor(e.currentTarget)}
            >
              <SentimentSatisfiedAltIcon />
            </IconButton>
          </Tooltip>
        </div>

        {/* Reactions Popover */}
        <Popover
          open={Boolean(reactionsAnchor)}
          anchorEl={reactionsAnchor}
          onClose={() => setReactionsAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          transformOrigin={{ vertical: "bottom", horizontal: "center" }}
          slotProps={{
            paper: {
              sx: {
                bgcolor: "transparent",
                boxShadow: "none",
                p: 0,
                mb: 1.5,
              },
            },
          }}
        >
          <div className="reactions-bar">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className="reaction-emoji-btn"
                onClick={() => {
                  onSendReaction && onSendReaction(emoji);
                  setReactionsAnchor(null);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Popover>

        {/* More Options Control */}
        <div className="control-item">
          <Tooltip title="More options" arrow>
            <IconButton
              className="control-btn"
              onClick={(e) => setMoreAnchor(e.currentTarget)}
            >
              <MoreHorizIcon />
            </IconButton>
          </Tooltip>
        </div>

        {/* More Options Menu */}
        <Menu
          anchorEl={moreAnchor}
          open={Boolean(moreAnchor)}
          onClose={() => setMoreAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          transformOrigin={{ vertical: "bottom", horizontal: "center" }}
          slotProps={{
            paper: {
              sx: {
                bgcolor: themeMode === "light" ? "#ffffff" : "#1e222d",
                color: themeMode === "light" ? "#111827" : "#ffffff",
                border: "1px solid",
                borderColor:
                  themeMode === "light" ? "#e5e7eb" : "rgba(255,255,255,0.1)",
                borderRadius: 2,
                mb: 1,
              },
            },
          }}
        >
          <MenuItem
            onClick={() => {
              setMoreAnchor(null);
              onEditName && onEditName();
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1.5 }} />
            Edit My Name
          </MenuItem>
          <MenuItem onClick={handleCopyLink}>
            <ContentCopyIcon fontSize="small" sx={{ mr: 1.5 }} />
            {copiedLink ? "Link Copied!" : "Copy Meeting Link"}
          </MenuItem>
        </Menu>

        {/* Leave Meeting Button */}
        <Button
          variant="contained"
          className="leave-btn"
          onClick={onLeaveMeeting}
        >
          <CallEndIcon />
        </Button>
      </div>
    </footer>
  );
}

export default MeetingControls;
