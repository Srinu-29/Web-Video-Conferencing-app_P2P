import React, { useState, useRef, useEffect } from "react";
import { IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import "./MeetingChat.css";

const AVATAR_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#6366f1", // indigo
];

function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function MeetingChat({
  messages = [],
  me,
  participantCount = 1,
  onSendMessage,
  onClose,
  mode = "sidebar", // "sidebar" or "overlay"
  themeMode = "dark",
}) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      const now = new Date();
      return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <aside
      className={`meeting-chat mode-${mode} ${
        themeMode === "light" ? "light-theme" : ""
      }`}
    >
      {/* Overlay Drag Bar */}
      {mode === "overlay" && <div className="chat-drag-handle" />}

      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-title-wrap">
          <span className="chat-title">Meeting Chat</span>
          <span className="chat-participant-count">
            {participantCount} participants
          </span>
        </div>
        {onClose && (
          <Tooltip title="Close Chat" arrow>
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ color: "inherit", opacity: 0.8 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </div>

      {/* Date Divider */}
      <div className="chat-date-divider">
        <span className="chat-date-chip">Today</span>
      </div>

      {/* Message List */}
      <div className="chat-messages-container">
        {messages.map((msg, index) => {
          const isMe = msg.senderId === me;
          const senderName = msg.senderName || (isMe ? "You" : msg.senderId?.substring(0, 5) || "Guest");
          const initial = senderName.charAt(0).toUpperCase();
          const avatarBg = getAvatarColor(senderName);

          return (
            <div
              key={msg.id || `${msg.senderId}_${msg.timestamp || index}`}
              className={`chat-message-row ${isMe ? "is-me" : ""}`}
            >
              <div
                className="chat-avatar"
                style={{ backgroundColor: avatarBg }}
              >
                {initial}
              </div>

              <div className="chat-message-body">
                <div className="chat-message-meta">
                  <span className="chat-sender-name">{senderName}</span>
                  <span className="chat-timestamp">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
                <div className={`chat-bubble ${isMe ? "me" : "them"}`}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Row */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <Tooltip title="Insert emoji" arrow>
            <IconButton
              size="small"
              onClick={() => setInputText((prev) => prev + " 😊")}
              sx={{ color: "#9ca3af", p: 0.5 }}
            >
              <SentimentSatisfiedAltIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <input
            type="text"
            className="chat-text-input"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <Tooltip title="Attach file" arrow>
            <IconButton size="small" sx={{ color: "#9ca3af", p: 0.5 }}>
              <AttachFileIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </div>

        <Tooltip title="Send message" arrow>
          <IconButton
            size="small"
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!inputText.trim()}
          >
            <SendIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </div>
    </aside>
  );
}

export default MeetingChat;
