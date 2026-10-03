import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Typography, Container, Box, Button } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import { useParams } from "react-router-dom";

const backendURL = `http://${window.location.hostname}:5000`;
const socket = io(backendURL);

function Room() {
  const { roomID } = useParams();

  const myVideoRef = useRef(null);
  const streamRef = useRef(null);

  // THE DICTIONARY OF ENGINES
  const peersRef = useRef({});

  const [me, setMe] = useState("");
  const [hasVideo, setHasVideo] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // THE ARRAY OF FRIENDS (For the UI)
  const [remoteStreams, setRemoteStreams] = useState([]);

  // UI STATE DICTIONARIES
  const [mutedUsers, setMutedUsers] = useState({});
  const [videoOffUsers, setVideoOffUsers] = useState({});

  useEffect(() => {
    // ATTEMPT 1: Try to get both Camera and Mic
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        streamRef.current = currentStream;
        setHasVideo(true);
        setHasMic(true);
        if (myVideoRef.current) myVideoRef.current.srcObject = currentStream;
      })
      .catch((err) => {
        // ATTEMPT 2 (The Fallback): Try just the Microphone
        console.log("Failed to get Camera. Trying Microphone only...", err);
        return navigator.mediaDevices
          .getUserMedia({ video: false, audio: true })
          .then((audioOnlyStream) => {
            streamRef.current = audioOnlyStream;
            setHasVideo(false);
            setHasMic(true); // We got the mic!
          });
      })
      .catch((err) => {
        // ATTEMPT 3: Complete failure (No Camera, No Mic)
        console.log("No camera OR microphone found. Viewer only.", err);
        setHasVideo(false);
        setHasMic(false);
      })
      .finally(() => {
        // Run this at the very end to guarantee the hardware race is over
        joinRoom();
      });

    const joinRoom = () => {
      // SCENARIO 1: The internet was faster than the user.
      // We are already fully connected to the backend. Join the room immediately!
      if (socket.connected) {
        setMe(socket.id);
        socket.emit("join-room", roomID, socket.id);
      } else {
        socket.on("connect", () => {
          setMe(socket.id);
          socket.emit("join-room", roomID, socket.id);
        });
      }
    };

    // --- SIGNALING LISTENERS ---

    // Helper function to send our current hardware state to ONE specific user
    const sendMyStateTo = (targetId) => {
      const audioTrack = streamRef.current?.getAudioTracks()[0];
      const videoTrack = streamRef.current?.getVideoTracks()[0];
      socket.emit("direct-state", {
        target: targetId,
        isMuted: audioTrack ? !audioTrack.enabled : false,
        isVideoOff: videoTrack ? !videoTrack.enabled : false,
      });
    };

    socket.on("user-connected", async (newUserId) => {
      console.log("Someone arrived! Initiating call...", newUserId);
      sendMyStateTo(newUserId); // Tell ONLY the new person our current state
      await createOffer(newUserId);
    });

    socket.on("offer", async (payload) => {
      console.log("Received an offer! Answering...", payload);
      sendMyStateTo(payload.caller); // Tell ONLY the caller our current state
      await createAnswer(payload);
    });

    socket.on("answer", async (payload) => {
      const peer = peersRef.current[payload.caller];
      if (peer) {
        await peer.setRemoteDescription(
          new RTCSessionDescription(payload.signal),
        );
      }
    });

    socket.on("ice-candidate", async (incoming) => {
      const peer = peersRef.current[incoming.caller];
      if (peer) {
        await peer.addIceCandidate(new RTCIceCandidate(incoming.candidate));
      }
    });

    socket.on("user-disconnected", (userId) => {
      console.log("User disconnected:", userId);
      // Close the engine
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
      }
      // Remove from UI
      setRemoteStreams((prev) => prev.filter((user) => user.id !== userId));
    });

    // Catch the UI shouts and save them into the dictionary
    socket.on("user-toggled-mute", (userId, isMuted) => {
      setMutedUsers((prev) => ({ ...prev, [userId]: isMuted }));
    });

    socket.on("user-toggled-video", (userId, isVideoOff) => {
      setVideoOffUsers((prev) => ({ ...prev, [userId]: isVideoOff }));
    });

    // CLEANUP: runs when leaving the page / remounting, so listeners never stack up
    return () => {
      [
        "connect",
        "user-connected",
        "offer",
        "answer",
        "ice-candidate",
        "user-disconnected",
        "user-toggled-mute",
        "user-toggled-video",
      ].forEach((event) => socket.off(event));

      Object.values(peersRef.current).forEach((peer) => peer.close());
      peersRef.current = {};
      setRemoteStreams([]);
    };
  }, [roomID]);

  // =========================================================================
  // === MUTE & VIDEO CONTROLS ===============================================
  // =========================================================================

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const isCurrentlyEnabled = audioTrack.enabled;
        audioTrack.enabled = !isCurrentlyEnabled;

        // If the hardware WAS enabled, it is now muted (true)
        const isNowMuted = isCurrentlyEnabled;
        setIsMuted(isNowMuted);
        socket.emit("toggle-mute", roomID, isNowMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      // Grab the first video track (the webcam)
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const isCurrentlyEnabled = videoTrack.enabled;

        // Flip the physical hardware switch
        videoTrack.enabled = !isCurrentlyEnabled;

        // If the hardware WAS enabled, it is now turned off (true)
        const isNowVideoOff = isCurrentlyEnabled;
        setIsVideoOff(isNowVideoOff);
        socket.emit("toggle-video", roomID, isNowVideoOff);
      }
    }
  };

  // =========================================================================
  // === NATIVE WEBRTC LOGIC =================================================
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
          caller: socket.id, // Must tell them who this path belongs to!
          candidate: event.candidate,
        });
      }
    };

    peer.ontrack = (event) => {
      setRemoteStreams((prev) => {
        // Prevent duplicates if the engine triggers twice
        if (prev.find((u) => u.id === targetUserId)) return prev;
        return [...prev, { id: targetUserId, stream: event.streams[0] }];
      });
    };

    // If we already had an engine for this person, shut it down so it can't leak or duplicate
    if (peersRef.current[targetUserId]) {
      peersRef.current[targetUserId].close();
    }
    peersRef.current[targetUserId] = peer;
    return peer;
  };

  const createOffer = async (targetUserId) => {
    const peer = createPeerConnection(targetUserId);
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
    const peer = createPeerConnection(payload.caller);
    await peer.setRemoteDescription(new RTCSessionDescription(payload.signal));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit("answer", {
      target: payload.caller,
      caller: socket.id,
      signal: answer,
    });
  };

  return (
    <Container maxWidth="md" sx={{ textAlign: "center", mt: 5 }}>
      <Typography variant="h4" gutterBottom>
        Meeting Room: {roomID}
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        My ID: {me || "Connecting..."}
      </Typography>

      <Box
        sx={{
          mt: 4,
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {/* Our Personal Video */}
        <Box
          sx={{
            position: "relative",
            width: "400px",
            height: "300px",
            borderRadius: "10px",
            backgroundColor: "#000",
            overflow: "hidden",
          }}
        >
          <video
            playsInline
            muted
            autoPlay
            ref={myVideoRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: isVideoOff ? 0 : 1,
            }}
          />

          {(!hasVideo || isVideoOff) && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "#333",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography color="white">
                {!hasVideo ? "No Camera Found" : "Your Camera Off"}
              </Typography>
            </Box>
          )}

          {/* Name Tag */}
          <Box
            sx={{
              position: "absolute",
              bottom: 10,
              left: 10,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              padding: "4px 10px",
              borderRadius: "4px",
            }}
          >
            <Typography variant="body2" color="white" fontWeight="bold">
              You
            </Typography>
          </Box>

          {/* If I am muted, show the red icon in the top right corner */}
          {isMuted && (
            <Box
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
                backgroundColor: "rgba(255, 0, 0, 0.8)",
                borderRadius: "50%",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MicOffIcon sx={{ color: "white", fontSize: 24 }} />
            </Box>
          )}
        </Box>

        {/* Loop over the dictionary and render ALL remote friends! */}
        {remoteStreams.map((user) => (
          <Box
            key={user.id}
            sx={{
              position: "relative",
              width: "400px",
              height: "300px",
              borderRadius: "10px",
              backgroundColor: "#222",
              overflow: "hidden",
            }}
          >
            <video
              playsInline
              autoPlay
              ref={(el) => {
                if (el) el.srcObject = user.stream;
              }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />

            {videoOffUsers[user.id] && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#333",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <VideocamOffIcon sx={{ color: "white", fontSize: 40, mb: 1 }} />
                <Typography color="white">Camera Off</Typography>
              </Box>
            )}

            {mutedUsers[user.id] && (
              <Box
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  backgroundColor: "rgba(255, 0, 0, 0.8)",
                  borderRadius: "50%",
                  padding: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MicOffIcon sx={{ color: "white", fontSize: 24 }} />
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Control Buttons */}
      <Box sx={{ mt: 4, display: "flex", justifyContent: "center", gap: 3 }}>
        {hasMic && (
          <Button
            variant="contained"
            color={isMuted ? "error" : "primary"}
            onClick={toggleAudio}
            startIcon={isMuted ? <MicOffIcon /> : <MicIcon />}
          >
            {isMuted ? "Unmute" : "Mute"}
          </Button>
        )}

        {hasVideo && (
          <Button
            variant="contained"
            color={isVideoOff ? "error" : "primary"}
            onClick={toggleVideo}
            startIcon={isVideoOff ? <VideocamOffIcon /> : <VideocamIcon />}
          >
            {isVideoOff ? "Turn Video On" : "Turn Video Off"}
          </Button>
        )}
      </Box>
    </Container>
  );
}

export default Room;
