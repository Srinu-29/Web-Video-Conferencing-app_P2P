import React, { useState, useEffect } from "react";
import { IconButton, Tooltip, Badge } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import GridViewIcon from "@mui/icons-material/GridView";
import FeaturedVideoIcon from "@mui/icons-material/FeaturedVideo";
import ViewSidebarIcon from "@mui/icons-material/ViewSidebar";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import ChatIcon from "@mui/icons-material/Chat";
import "./MeetingHeader.css";

function MeetingHeader({
  participantCount,
  layout,
  onSelectLayout,
  isChatOpen,
  onToggleChat,
  unreadCount = 0,
  themeMode,
  onToggleTheme,
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const formatTimer = (totalSec) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const pad = (n) => String(n).padStart(2, "0");
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <header
      className={`meeting-header ${themeMode === "light" ? "light-theme" : ""}`}
    >
      <div className="header-left">
        <div className="logo-icon-wrap">MF</div>
        <span className="meeting-title">Meeting Room</span>
        <div className="participant-chip">
          <PeopleIcon sx={{ fontSize: 16 }} />
          <span>
            {participantCount}
            <span className="chip-label-text"> participants</span>
          </span>
        </div>
      </div>

      <div className="header-right">
        <div className="timer-badge">{formatTimer(elapsedSeconds)}</div>

        {/* Layout Switcher */}
        <div className="layout-button-group">
          <Tooltip title="Grid View (Layout 1)" arrow>
            <IconButton
              size="small"
              className={`layout-btn ${layout === "grid" ? "active" : ""}`}
              onClick={() => onSelectLayout("grid")}
            >
              <GridViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Spotlight View (Layout 2)" arrow>
            <IconButton
              size="small"
              className={`layout-btn ${layout === "spotlight" ? "active" : ""}`}
              onClick={() => onSelectLayout("spotlight")}
            >
              <FeaturedVideoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Participant Sidebar (Layout 3)" arrow>
            <IconButton
              size="small"
              className={`layout-btn ${layout === "sidebar" ? "active" : ""}`}
              onClick={() => onSelectLayout("sidebar")}
            >
              <ViewSidebarIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>

        {/* Theme Toggle */}
        <Tooltip
          title={`Switch to ${themeMode === "dark" ? "Light" : "Dark"} theme`}
          arrow
        >
          <IconButton
            size="small"
            onClick={onToggleTheme}
            sx={{ color: "inherit" }}
          >
            {themeMode === "dark" ? (
              <LightModeIcon fontSize="small" />
            ) : (
              <DarkModeIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        {/* Fullscreen Toggle */}
        <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} arrow>
          <IconButton
            size="small"
            className="header-fullscreen-btn"
            onClick={handleToggleFullscreen}
            sx={{ color: "inherit" }}
          >
            {isFullscreen ? (
              <FullscreenExitIcon fontSize="small" />
            ) : (
              <FullscreenIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        {/* Chat Toggle Button in Header */}
        <Tooltip title="Toggle Chat" arrow>
          <IconButton
            size="small"
            onClick={onToggleChat}
            sx={{
              color: isChatOpen ? "#2563eb" : "inherit",
              bgcolor: isChatOpen
                ? themeMode === "light"
                  ? "#eff6ff"
                  : "rgba(37, 99, 235, 0.15)"
                : "transparent",
            }}
          >
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <ChatIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
      </div>
    </header>
  );
}

export default MeetingHeader;
