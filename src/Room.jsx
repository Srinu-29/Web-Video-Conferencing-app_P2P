import React, { useEffect, useRef, useState, useMemo } from "react";
import { io } from "socket.io-client";
import { useParams, useNavigate } from "react-router-dom";
import { IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";

import MeetingHeader from "./MeetingHeader";
import ParticipantTile from "./ParticipantTile";
import MeetingChat from "./MeetingChat";
import MeetingControls from "./MeetingControls";
import "./Room.css";

const backendURL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const socket = io(backendURL);

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
  "linear-gradient(135deg, #10b981 0%, #047857 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)",
  "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
];

function getAvatarBackground(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

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

function Room() {
  const { roomID } = useParams();
  const navigate = useNavigate();

  const streamRef = useRef(null);

  // THE DICTIONARY OF ENGINES
  const peersRef = useRef({});
  const pendingCandidatesRef = useRef({});

  // MY NAME & ID
  const [myUserName, setMyUserName] = useState(() => {
    return sessionStorage.getItem("userName") || "Guest";
  });
  const myUserNameRef = useRef(myUserName);

  // Save to sessionStorage and sync ref
  useEffect(() => {
    sessionStorage.setItem("userName", myUserName);
    myUserNameRef.current = myUserName;
  }, [myUserName]);

  // HARDWARE STATES
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // PARTICIPANT ARRAYS & DICTIONARIES
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [remoteUserNames, setRemoteUserNames] = useState({});
  const [mutedUsers, setMutedUsers] = useState({});
  const [videoOffUsers, setVideoOffUsers] = useState({});

  // CHAT STATE
  const [messages, setMessages] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // UI LAYOUT MODES: 'grid' (Layout 1) | 'spotlight' (Layout 2) | 'sidebar' (Layout 3)
  const [layout, setLayout] = useState("spotlight");
  const [themeMode, setThemeMode] = useState("dark"); // 'dark' | 'light'
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  // SPOTLIGHT STATE
  const [spotlightId, setSpotlightId] = useState(null);

  // INVITE LINK COPY STATE
  const [copiedInvite, setCopiedInvite] = useState(false);

  const handleCopyInviteLink = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href).catch(() => {
        fallbackCopyText(window.location.href);
      });
    } else {
      fallbackCopyText(window.location.href);
    }
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  // GRID PAGINATION FOR > 4 PARTICIPANTS
  const [gridPage, setGridPage] = useState(0);

  // FLOATING REACTIONS STATE
  const [activeReactions, setActiveReactions] = useState([]);

  // SIDEBAR SEARCH FILTER
  const [sidebarSearch, setSidebarSearch] = useState("");

  // =========================================================================
  // === WEBRTC & SOCKET SETUP ===============================================
  // =========================================================================

  useEffect(() => {
    // ATTEMPT 1: Try to get both Camera and Mic
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        streamRef.current = currentStream;
        setLocalStream(currentStream);
      })
      .catch((err) => {
        // ATTEMPT 2: Fallback to Mic only
        console.log("Failed to get Camera. Trying Microphone only...", err);
        setIsVideoOff(true);
        return navigator.mediaDevices
          .getUserMedia({ video: false, audio: true })
          .then((audioOnlyStream) => {
            streamRef.current = audioOnlyStream;
            setLocalStream(audioOnlyStream);
          });
      })
      .catch((err) => {
        // ATTEMPT 3: Complete failure (viewer-only mode)
        console.log("No camera OR microphone found. Viewer only.", err);
        setIsVideoOff(true);
        setIsMuted(true);
        setLocalStream(null);
      })
      .finally(() => {
        joinRoom();
      });

    const handleConnect = () => {
      socket.emit(
        "join-room",
        roomID,
        socket.id,
        myUserNameRef.current || "Guest",
      );
    };

    const joinRoom = () => {
      if (socket.connected) {
        handleConnect();
      }
      socket.on("connect", handleConnect);
    };

    const sendMyStateTo = (targetId) => {
      const audioTrack = streamRef.current?.getAudioTracks()[0];
      const videoTrack = streamRef.current?.getVideoTracks()[0];
      socket.emit("direct-state", {
        target: targetId,
        isMuted: audioTrack ? !audioTrack.enabled : isMuted,
        isVideoOff: videoTrack ? !videoTrack.enabled : isVideoOff,
      });
    };

    socket.on("all-usernames", (dictionary) => {
      if (dictionary) {
        const { [socket.id]: _, ...others } = dictionary;
        setRemoteUserNames(others);
      }
    });

    socket.on("user-connected", async (newUserId, newUserName) => {
      console.log(`Someone arrived! ${newUserName} (${newUserId})`);
      setRemoteUserNames((prev) => ({ ...prev, [newUserId]: newUserName }));
      sendMyStateTo(newUserId);
      await createOffer(newUserId);
    });

    socket.on("offer", async (payload) => {
      console.log("Received an offer! Answering...", payload);
      sendMyStateTo(payload.caller);
      await createAnswer(payload);
    });

    socket.on("answer", async (payload) => {
      const peer = peersRef.current[payload.caller];
      if (peer) {
        await peer.setRemoteDescription(
          new RTCSessionDescription(payload.signal),
        );

        // Flush any ICE candidates that arrived before the answer was set
        const queued = pendingCandidatesRef.current[payload.caller] || [];
        for (const candidate of queued) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn("Error adding queued ICE candidate:", e);
          }
        }
        delete pendingCandidatesRef.current[payload.caller];
      }
    });

    socket.on("ice-candidate", async (incoming) => {
      const peer = peersRef.current[incoming.caller];
      if (peer && peer.remoteDescription) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(incoming.candidate));
        } catch (e) {
          console.warn("Error adding ICE candidate:", e);
        }
      } else {
        // Queue candidate until setRemoteDescription completes
        if (!pendingCandidatesRef.current[incoming.caller]) {
          pendingCandidatesRef.current[incoming.caller] = [];
        }
        pendingCandidatesRef.current[incoming.caller].push(incoming.candidate);
      }
    });

    socket.on("user-disconnected", (userId) => {
      console.log("User disconnected:", userId);
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
      }
      delete pendingCandidatesRef.current[userId];
      setRemoteStreams((prev) => prev.filter((user) => user.id !== userId));

      // Reusable helper to cleanly remove user from all metadata dictionaries
      const removeUserFrom = (prev) => {
        const { [userId]: _, ...rest } = prev;
        return rest;
      };
      setRemoteUserNames(removeUserFrom);
      setMutedUsers(removeUserFrom);
      setVideoOffUsers(removeUserFrom);

      setSpotlightId((prev) => (prev === userId ? null : prev));
    });

    socket.on("user-toggled-mute", (userId, userMuted) => {
      setMutedUsers((prev) => ({ ...prev, [userId]: userMuted }));
    });

    socket.on("user-toggled-video", (userId, userVideoOff) => {
      setVideoOffUsers((prev) => ({ ...prev, [userId]: userVideoOff }));
    });

    socket.on("user-name-changed", (userId, newName) => {
      setRemoteUserNames((prev) => ({ ...prev, [userId]: newName }));
    });

    socket.on("chat-history", (historyArray) => {
      setMessages(historyArray || []);
    });

    socket.on("receive-chat", (messageObj) => {
      setMessages((prev) => [...prev, messageObj]);
      if (!isChatOpenRef.current) {
        setUnreadChatCount((prev) => prev + 1);
      }
    });

    // Real-time floating reactions from peers
    socket.on("receive-reaction", (emoji) => {
      const reactionId = Date.now() + Math.random();
      setActiveReactions((prev) => [...prev, { id: reactionId, emoji }]);
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== reactionId));
      }, 2800);
    });

    // Cleanup when unmounting
    return () => {
      socket.emit("leave-room", roomID);
      socket.off("connect", handleConnect);
      [
        "user-connected",
        "offer",
        "answer",
        "ice-candidate",
        "user-disconnected",
        "user-toggled-mute",
        "user-toggled-video",
        "user-name-changed",
        "chat-history",
        "receive-chat",
        "receive-reaction",
        "all-usernames",
      ].forEach((event) => socket.off(event));

      // Stop camera and microphone hardware tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      Object.values(peersRef.current).forEach((peer) => peer.close());
      peersRef.current = {};
      pendingCandidatesRef.current = {};
      setRemoteStreams([]);
    };
  }, [roomID]);

  // =========================================================================
  // === NATIVE WEBRTC CALL ENGINE ===========================================
  // =========================================================================

  const createPeerConnection = (targetUserId) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, streamRef.current);
      });
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          target: targetUserId,
          caller: socket.id,
          candidate: event.candidate,
        });
      }
    };

    peer.ontrack = (event) => {
      const incomingStream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams((prev) => {
        const existingIndex = prev.findIndex((u) => u.id === targetUserId);
        if (existingIndex !== -1) {
          const current = prev[existingIndex];
          if (current.stream !== incomingStream) {
            const updated = [...prev];
            updated[existingIndex] = { ...current, stream: incomingStream };
            return updated;
          }
          return prev;
        }
        return [...prev, { id: targetUserId, stream: incomingStream }];
      });
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed") {
        console.warn(
          `Connection with ${targetUserId} failed. Restarting ICE...`,
        );
        peer.restartIce();
      }
    };

    if (peersRef.current[targetUserId]) {
      peersRef.current[targetUserId].close();
    }
    peersRef.current[targetUserId] = peer;
    return peer;
  };

  const createOffer = async (targetUserId) => {
    let peer = peersRef.current[targetUserId];
    if (!peer || peer.signalingState === "closed") {
      peer = createPeerConnection(targetUserId);
    }
    const offer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await peer.setLocalDescription(offer);
    socket.emit("offer", {
      target: targetUserId,
      caller: socket.id,
      signal: offer,
    });
  };

  const createAnswer = async (payload) => {
    let peer = peersRef.current[payload.caller];
    if (!peer || peer.signalingState === "closed") {
      peer = createPeerConnection(payload.caller);
    }
    await peer.setRemoteDescription(new RTCSessionDescription(payload.signal));

    // Flush any pending ICE candidates for this caller
    const queued = pendingCandidatesRef.current[payload.caller] || [];
    for (const candidate of queued) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Error adding queued ICE candidate:", err);
      }
    }
    delete pendingCandidatesRef.current[payload.caller];

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit("answer", {
      target: payload.caller,
      caller: socket.id,
      signal: answer,
    });
  };

  // =========================================================================
  // === MEDIA CONTROLS & HANDLERS ===========================================
  // =========================================================================

  const toggleAudio = async () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      const isCurrentlyEnabled = audioTrack.enabled;
      audioTrack.enabled = !isCurrentlyEnabled;
      const isNowMuted = !audioTrack.enabled;
      setIsMuted(isNowMuted);
      socket.emit("toggle-mute", roomID, isNowMuted);
      return;
    }

    // Microphone wasn't acquired initially. Try to acquire it now:
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const newAudioTrack = audioStream.getAudioTracks()[0];
      if (!newAudioTrack) return;

      if (streamRef.current) {
        streamRef.current.addTrack(newAudioTrack);
      } else {
        streamRef.current = new MediaStream([newAudioTrack]);
      }
      setLocalStream(new MediaStream(streamRef.current.getTracks()));
      setIsMuted(false);
      socket.emit("toggle-mute", roomID, false);

      // Add the new track to all established peers and renegotiate
      for (const [targetId, peer] of Object.entries(peersRef.current)) {
        if (peer.signalingState !== "closed") {
          peer.addTrack(newAudioTrack, streamRef.current);
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket.emit("offer", {
            target: targetId,
            caller: socket.id,
            signal: offer,
          });
        }
      }
    } catch (err) {
      console.warn("Could not access microphone:", err);
      alert(
        "Unable to access microphone. Please check your browser permissions.",
      );
    }
  };

  const toggleVideo = async () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      const isCurrentlyEnabled = videoTrack.enabled;
      videoTrack.enabled = !isCurrentlyEnabled;
      const isNowVideoOff = !videoTrack.enabled;
      setIsVideoOff(isNowVideoOff);
      socket.emit("toggle-video", roomID, isNowVideoOff);
      return;
    }

    // Camera wasn't acquired initially. Try to acquire it now:
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      const newVideoTrack = videoStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      if (streamRef.current) {
        streamRef.current.addTrack(newVideoTrack);
      } else {
        streamRef.current = new MediaStream([newVideoTrack]);
      }
      setLocalStream(new MediaStream(streamRef.current.getTracks()));
      setIsVideoOff(false);
      socket.emit("toggle-video", roomID, false);

      // Add the new track to all established peers and renegotiate
      for (const [targetId, peer] of Object.entries(peersRef.current)) {
        if (peer.signalingState !== "closed") {
          peer.addTrack(newVideoTrack, streamRef.current);
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket.emit("offer", {
            target: targetId,
            caller: socket.id,
            signal: offer,
          });
        }
      }
    } catch (err) {
      console.warn("Could not access camera:", err);
      alert("Unable to access camera. Please check your browser permissions.");
    }
  };

  const handleSendMessage = (text) => {
    const msgId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = Date.now();
    socket.emit("send-chat", roomID, text, myUserName);
    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        senderId: socket.id,
        senderName: myUserName,
        text,
        timestamp,
      },
    ]);
  };

  const handleEditMyName = () => {
    const newName = window.prompt("Enter your new name:", myUserName);
    if (newName && newName.trim() !== "") {
      const trimmed = newName.trim();
      setMyUserName(trimmed);
      socket.emit("change-name", roomID, trimmed);
    }
  };

  const handleLeaveMeeting = () => {
    if (window.confirm("Are you sure you want to leave the meeting?")) {
      socket.emit("leave-room", roomID);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      navigate("/");
    }
  };

  const handleSendReaction = (emoji) => {
    const reactionId = Date.now() + Math.random();
    setActiveReactions((prev) => [...prev, { id: reactionId, emoji }]);
    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== reactionId));
    }, 2800);
    // Broadcast reaction to all other meeting participants in real-time
    socket.emit("send-reaction", roomID, emoji);
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => {
      if (!prev) setUnreadChatCount(0);
      return !prev;
    });
  };

  // =========================================================================
  // === PARTICIPANTS COMPILATION ============================================
  // =========================================================================

  const allParticipants = useMemo(() => {
    const list = [];

    // Local user
    list.push({
      id: socket.id || "me",
      name: myUserName,
      stream: localStream,
      isMe: true,
      isMuted,
      isVideoOff,
    });

    // Remote users: combine all participants in room roster (remoteUserNames) and active streams
    const remoteUserIds = new Set([
      ...Object.keys(remoteUserNames),
      ...remoteStreams.map((u) => u.id),
    ]);

    if (socket.id) {
      remoteUserIds.delete(socket.id);
    }

    remoteUserIds.forEach((userId) => {
      const streamObj = remoteStreams.find((u) => u.id === userId);

      const hasVideoTrack = Boolean(
        streamObj?.stream?.getVideoTracks()?.some((t) => t.enabled),
      );
      const isVideoOffEffective =
        videoOffUsers[userId] !== undefined
          ? !!videoOffUsers[userId]
          : !hasVideoTrack;

      const hasAudioTrack = Boolean(
        streamObj?.stream?.getAudioTracks()?.some((t) => t.enabled),
      );
      const isMutedEffective =
        mutedUsers[userId] !== undefined
          ? !!mutedUsers[userId]
          : !hasAudioTrack;

      list.push({
        id: userId,
        name: remoteUserNames[userId] || "Guest",
        stream: streamObj?.stream || null,
        isMe: false,
        isMuted: isMutedEffective,
        isVideoOff: isVideoOffEffective,
      });
    });

    return list;
  }, [
    myUserName,
    isMuted,
    isVideoOff,
    remoteStreams,
    remoteUserNames,
    mutedUsers,
    videoOffUsers,
    localStream,
  ]);

  // Actual human participant count
  const humanParticipantCount = allParticipants.length;

  // Decide effective spotlight participant:
  // Triggered when: 1. participant manually selected, OR 2. user explicitly chooses spotlight layout
  const effectiveSpotlightId = useMemo(() => {
    if (spotlightId) return spotlightId;
    if (layout === "spotlight" || layout === "sidebar") {
      return allParticipants[0]?.id || null;
    }
    return null;
  }, [spotlightId, layout, allParticipants]);

  const spotlightParticipant = useMemo(() => {
    return (
      allParticipants.find((p) => p.id === effectiveSpotlightId) ||
      allParticipants[0]
    );
  }, [allParticipants, effectiveSpotlightId]);

  // Grid pagination constants & visible participants
  const pageSize = 4;
  const gridTotalPages = Math.ceil(allParticipants.length / pageSize) || 1;
  const visibleGridParticipants = useMemo(() => {
    if (allParticipants.length <= pageSize) return allParticipants;
    return allParticipants.slice(
      gridPage * pageSize,
      gridPage * pageSize + pageSize,
    );
  }, [allParticipants, gridPage]);

  // Prevent getting stranded on an empty page if participants disconnect
  useEffect(() => {
    if (gridPage > 0 && gridPage >= gridTotalPages) {
      setGridPage(gridTotalPages - 1);
    }
  }, [gridPage, gridTotalPages]);

  // =========================================================================
  // === RENDER LAYOUT VIEWS =================================================
  // =========================================================================

  // Layout 1: Grid View
  const renderGridView = () => {
    const totalCount = allParticipants.length;
    let gridClass = "grid-count-1";
    if (totalCount === 2) gridClass = "grid-count-2";
    else if (totalCount === 3) gridClass = "grid-count-3";
    else if (totalCount === 4) gridClass = "grid-count-4";
    else if (totalCount > 4) gridClass = "grid-count-more";

    return (
      <div className="video-grid-wrapper">
        <div className={`video-grid-container ${gridClass}`}>
          {visibleGridParticipants.map((p) => (
            <ParticipantTile key={p.id} participant={p} />
          ))}
        </div>

        {/* If > 4 participants: Clean pagination bar */}
        {totalCount > 4 && (
          <div className="grid-pagination-bar">
            <IconButton
              size="small"
              disabled={gridPage === 0}
              onClick={() => setGridPage((prev) => Math.max(0, prev - 1))}
              sx={{ color: "inherit" }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <span className="grid-page-indicator">
              Page {gridPage + 1} of {gridTotalPages} ({totalCount}{" "}
              participants)
            </span>
            <IconButton
              size="small"
              disabled={gridPage >= gridTotalPages - 1}
              onClick={() =>
                setGridPage((prev) => Math.min(gridTotalPages - 1, prev + 1))
              }
              sx={{ color: "inherit" }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </div>
        )}
      </div>
    );
  };

  // Layout 2: Spotlight View + Filmstrip ("Participants List")
  const renderSpotlightView = () => {
    return (
      <div className="spotlight-layout-container">
        {/* Main Stage Spotlight */}
        <div className="spotlight-main-stage">
          {spotlightParticipant && (
            <ParticipantTile
              participant={spotlightParticipant}
              isSpotlight
              onSpotlight={() => {}}
            />
          )}
        </div>

        {/* Bottom Filmstrip ("Participants List"): shows all participants + invite button */}
        <div className="spotlight-bottom-filmstrip">
          {allParticipants.map((p) => {
            const isSpotlightCard = p.id === spotlightParticipant?.id;
            return (
              <div
                key={p.id}
                className="spotlight-filmstrip-item"
                onClick={() => setSpotlightId(p.id)}
              >
                <ParticipantTile
                  participant={p}
                  isMini
                  isSpotlightCard={isSpotlightCard}
                  muteAudio={p.isMe || isSpotlightCard}
                />
              </div>
            );
          })}

          {/* + Invite People Card */}
          <div
            className="invite-people-card"
            onClick={handleCopyInviteLink}
            title="Click to copy invite link"
          >
            <div className="invite-icon-circle">
              {copiedInvite ? (
                <CheckIcon sx={{ fontSize: 22, color: "#10b981" }} />
              ) : (
                <AddIcon sx={{ fontSize: 22 }} />
              )}
            </div>
            <span className="invite-label">
              {copiedInvite ? "Link Copied!" : ""}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Layout 3: Participant Sidebar + Large Main Video
  const renderSidebarView = () => {
    const filteredParticipants = allParticipants.filter((p) =>
      p.name.toLowerCase().includes(sidebarSearch.toLowerCase()),
    );

    return (
      <div className="sidebar-layout-container">
        {/* Left Participants Sidebar */}
        <div className="participants-sidebar-panel">
          <div className="sidebar-panel-header">
            <span className="sidebar-panel-title">
              Participants ({allParticipants.length})
            </span>
          </div>

          <div className="sidebar-search-box">
            <SearchIcon sx={{ fontSize: 18, color: "#9ca3af" }} />
            <input
              type="text"
              className="sidebar-search-input"
              placeholder="Search participants..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
            />
          </div>

          <div className="sidebar-list-scroll">
            {filteredParticipants.map((p) => {
              const isSelected = p.id === spotlightParticipant?.id;
              return (
                <div
                  key={p.id}
                  className={`sidebar-participant-row ${
                    isSelected ? "is-active" : ""
                  }`}
                  onClick={() => setSpotlightId(p.id)}
                >
                  <div
                    className="sidebar-thumb-preview"
                    style={{ background: getAvatarBackground(p.name) }}
                  >
                    {p.name.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="sidebar-user-info">
                    <span className="sidebar-user-name">
                      {p.isMe ? `${p.name} (You)` : p.name}
                    </span>
                  </div>
                  {p.isMuted ? (
                    <MicOffIcon sx={{ fontSize: 16, color: "#ef4444" }} />
                  ) : (
                    <MicIcon sx={{ fontSize: 16, color: "#10b981" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Large Main Stage */}
        <div className="sidebar-main-stage">
          {spotlightParticipant && (
            <ParticipantTile
              participant={spotlightParticipant}
              isSpotlight
              onSpotlight={() => {}}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`meeting-room-container ${
        themeMode === "light" ? "light-theme" : ""
      }`}
    >
      {/* 1. Header */}
      <MeetingHeader
        participantCount={humanParticipantCount}
        layout={layout}
        onSelectLayout={(newLayout) => {
          setLayout(newLayout);
          if (newLayout === "spotlight" && !spotlightId) {
            setSpotlightId(allParticipants[0]?.id || null);
          }
        }}
        isChatOpen={isChatOpen}
        onToggleChat={handleToggleChat}
        unreadCount={unreadChatCount}
        themeMode={themeMode}
        onToggleTheme={() =>
          setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))
        }
      />

      {/* 2. Main Stage & Body */}
      <div className="meeting-main-content">
        <div className="meeting-stage-area">
          {layout === "grid" && renderGridView()}
          {layout === "spotlight" && renderSpotlightView()}
          {layout === "sidebar" && renderSidebarView()}

          {/* Floating Reactions overlay */}
          <div className="floating-reaction-container">
            {activeReactions.map((r) => (
              <span key={r.id} className="floating-reaction-bubble">
                {r.emoji}
              </span>
            ))}
          </div>
        </div>

        {/* 3. Meeting Chat Component */}
        {isChatOpen && (
          <MeetingChat
            messages={messages}
            me={socket.id}
            participantCount={humanParticipantCount}
            onSendMessage={handleSendMessage}
            onClose={() => setIsChatOpen(false)}
            mode={layout === "sidebar" ? "overlay" : "sidebar"}
            themeMode={themeMode}
          />
        )}
      </div>

      {/* 4. Controls Dock */}
      <MeetingControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isChatOpen={isChatOpen}
        isParticipantsOpen={layout === "spotlight"}
        unreadChatCount={unreadChatCount}
        participantCount={humanParticipantCount}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleChat={handleToggleChat}
        onToggleParticipants={() =>
          setLayout((prev) => (prev === "spotlight" ? "grid" : "spotlight"))
        }
        onSendReaction={handleSendReaction}
        onEditName={handleEditMyName}
        onLeaveMeeting={handleLeaveMeeting}
        themeMode={themeMode}
      />

      {/* Universal background audio playback for any remote participant not currently rendered with audio */}
      <div style={{ display: "none" }}>
        {remoteStreams
          .filter((user) => {
            if (layout === "spotlight") {
              return false; // Spotlight view renders all in filmstrip/stage
            }
            if (layout === "grid") {
              return !visibleGridParticipants.some((v) => v.id === user.id);
            }
            if (layout === "sidebar") {
              return user.id !== spotlightParticipant?.id;
            }
            return false;
          })
          .map((user) => (
            <audio
              key={user.id}
              ref={(el) => {
                if (el && el.srcObject !== user.stream) {
                  el.srcObject = user.stream;
                }
              }}
              autoPlay
              playsInline
            />
          ))}
      </div>
    </div>
  );
}

export default Room;
