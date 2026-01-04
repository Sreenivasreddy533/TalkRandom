import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { getRtcConfig } from "../utils/webrtcConfig";

const VideoChat = ({ onPartnerChange, onStatus, onError, panicFlag }) => {
  const { socket } = useSocket();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const partnerIdRef = useRef(null);

  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleMatchFound = async ({ partnerId }) => {
      console.log("✅ Match found:", partnerId);
      onStatus("Partner found. Connecting…");
      partnerIdRef.current = partnerId;
      onPartnerChange(partnerId);

      await setupPeerConnection();

      if (socket.id > partnerId) {
        await createAndSendOffer();
      }

      setIsInCall(true);
      setIsWaiting(false);
    };

    const handleWaiting = () => {
      console.log("⏳ Waiting for partner...");
      setIsWaiting(true);
      onStatus("Searching for a stranger…");
    };

    const handleOffer = async ({ from, sdp }) => {
      console.log("📨 Received offer from:", from);
      partnerIdRef.current = from;
      onPartnerChange(from);

      await setupPeerConnection();
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("webrtc-answer", { to: from, sdp: answer });

      setIsInCall(true);
      setIsWaiting(false);
    };

    const handleAnswer = async ({ from, sdp }) => {
      console.log("📨 Received answer from:", from);
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      if (pcRef.current && candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("ICE error:", err);
        }
      }
    };

    const handlePartnerDisconnected = () => {
      console.log("👤 Partner left");
      onStatus("Partner left. Click Next to find another.");
      teardownCall();
    };

    const handleErrorMessage = ({ message }) => {
      onError(message);
      teardownCall();
    };

    socket.on("match-found", handleMatchFound);
    socket.on("waiting", handleWaiting);
    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice-candidate", handleIceCandidate);
    socket.on("partner-disconnected", handlePartnerDisconnected);
    socket.on("error-message", handleErrorMessage);

    return () => {
      socket.off("match-found");
      socket.off("waiting");
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice-candidate");
      socket.off("partner-disconnected");
      socket.off("error-message");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const setupLocalMedia = async () => {
    if (localStreamRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      localStreamRef.current = stream;
      setCameraError(null);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      console.log("✅ Camera accessed successfully");
    } catch (err) {
      console.error("❌ Camera error:", err.message);
      setCameraError("📹 Camera blocked. Using chat-only mode.");
      onStatus("⚠️ Camera permission denied. Text chat still works!");
      
      // Still create peer connection for audio/data
      return;
    }
  };

  const setupPeerConnection = async () => {
    if (pcRef.current) return;

    await setupLocalMedia();

    const pc = new RTCPeerConnection(getRtcConfig());
    pcRef.current = pc;

    // Add local stream if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      console.log("📹 Received remote track");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && partnerIdRef.current && socket) {
        socket.emit("webrtc-ice-candidate", {
          to: partnerIdRef.current,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("🔗 Connection state:", pc.connectionState);
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      ) {
        onStatus("Connection lost. Click Next to try again.");
        teardownCall();
      }
    };
  };

  const createAndSendOffer = async () => {
    const pc = pcRef.current;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("webrtc-offer", { to: partnerIdRef.current, sdp: offer });
    console.log("📤 Sent offer to:", partnerIdRef.current);
  };

  const teardownCall = () => {
    setIsInCall(false);
    partnerIdRef.current = null;
    onPartnerChange(null);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const stopAllMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }
  };

  const handleStart = (meta) => {
    setupLocalMedia();
    socket.emit("find-partner", meta);
  };

  const handleNext = (meta) => {
    socket.emit("disconnect-partner");
    teardownCall();
    handleStart(meta);
  };

  const handleStop = () => {
    socket.emit("disconnect-partner");
    teardownCall();
    stopAllMedia();
    onStatus("Stopped. Click Start to connect again.");
    setCameraError(null);
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const enabled = !isMuted;
    localStreamRef.current
      .getAudioTracks()
      .forEach((t) => (t.enabled = !enabled));
    setIsMuted(enabled);
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const off = !videoOff;
    localStreamRef.current
      .getVideoTracks()
      .forEach((t) => (t.enabled = !off));
    setVideoOff(off);
  };

  useEffect(() => {
    if (panicFlag && socket) {
      socket.emit("panic");
      handleStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panicFlag]);

  return (
    <>
      <div className="video-grid">
        <div className="video-box">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%" }}
          />
          {!isInCall && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "radial-gradient(circle, rgba(0,0,0,.7), rgba(0,0,0,.95))",
                color: "#e0e6ed",
                textAlign: "center",
                fontSize: "1rem",
                padding: "1rem",
                zIndex: 1
              }}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                  👀 Waiting for a partner…
                </div>
                <div style={{ opacity: 0.8, fontSize: "0.9rem" }}>
                  Click Start to be matched.
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="video-box"
          style={{ alignSelf: "flex-start" }}
        >
          {cameraError ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.8)",
                color: "#fecaca",
                textAlign: "center",
                padding: "1rem"
              }}
            >
              <div>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📹</div>
                <div>{cameraError}</div>
                <div style={{ fontSize: "0.8rem", marginTop: "0.5rem", opacity: 0.7 }}>
                  Chat works fine without camera
                </div>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{ width: "100%", height: "100%" }}
              />
              <div className="video-label">You</div>
            </>
          )}
        </div>
      </div>

      <div className="controls-row">
        <button
          className="btn btn-primary"
          onClick={() => handleStart({})}
          disabled={isWaiting}
        >
          {isWaiting ? "⏳ Searching…" : "▶ Start"}
        </button>
        <button className="btn btn-ghost" onClick={() => handleNext({})}>
          ⏭ Next
        </button>
        <button className="btn btn-ghost" onClick={handleStop}>
          ⏹ Stop
        </button>
        <button className="btn btn-ghost" onClick={toggleMute} disabled={!localStreamRef.current}>
          {isMuted ? "🔇 Unmute" : "🔊 Mute"}
        </button>
        <button className="btn btn-ghost" onClick={toggleVideo} disabled={!localStreamRef.current}>
          {videoOff ? "📷 Video On" : "📹 Video Off"}
        </button>
      </div>
    </>
  );
};

export default VideoChat;
