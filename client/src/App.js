import React, { useEffect, useState } from "react";
import "./styles/theme.css";
import "./styles/App.css";
import { SocketProvider, useSocket } from "./context/SocketContext";
import VideoChat from "./components/VideoChat";
import ChatPanel from "./components/ChatPanel";
import ControlsBar from "./components/ControlsBar";

const MainApp = () => {
  const { socket, connected } = useSocket();
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [status, setStatus] = useState("🔗 Connecting…");
  const [error, setError] = useState("");
  const [partnerId, setPartnerId] = useState(null);
  const [showAgeGate, setShowAgeGate] = useState(true);
  const [panicFlag, setPanicFlag] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const confirmAdult = () => {
    setShowAgeGate(false);
    if (socket) {
      socket.emit("age-confirm", { isAdult: true });
    }
    setStatus("Click Start to meet someone new.");
  };

  const rejectAdult = () => {
    window.location.href = "https://www.google.com/";
  };

  const handleStatus = (msg) => {
    setStatus(msg);
    setError("");
  };

  const handleError = (msg) => {
    setError(msg);
  };

  const reportUser = () => {
    if (socket && partnerId) {
      socket.emit("report-user", { targetId: partnerId, reason: "reported" });
      handleStatus("User reported. Finding someone else…");
      socket.emit("disconnect-partner");
    }
  };

  const triggerPanic = () => {
    setPanicFlag((v) => !v);
  };

  return (
    <div className="app-root">
      {showAgeGate && (
        <div className="age-overlay">
          <div className="age-dialog">
            <h2>🔞 18+ Only</h2>
            <p>
              This platform connects you with random strangers. Never share personal
              information. If you see anything unsafe, disconnect immediately and report.
            </p>
            <div className="age-actions">
              <button className="btn btn-primary" onClick={confirmAdult}>
                ✅ I am 18+
              </button>
              <button className="btn btn-ghost" onClick={rejectAdult}>
                ❌ I am under 18
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="app-header">
        <div>
          <div className="app-title">🎥 TalkRandom  Video-Chat</div>
          <div className="app-tagline">Anonymous · 1-to-1 · No Sign-up</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
          <span
            style={{
              fontSize: "0.8rem",
              color: connected ? "var(--success)" : "var(--danger)",
              fontWeight: 600
            }}
          >
            {connected ? "✅ Connected" : "⏳ Connecting…"}
          </span>
        </div>
      </header>

      <main className="main-layout">
        <section className="card">
          <div style={{ marginBottom: "0.75rem" }}>
            <div className="status-text">📡 {status}</div>
            {error && <div className="error-text">❌ {error}</div>}
            <div className="badge-row">
              <span className="badge">WebRTC P2P</span>
              <span className="badge">End-to-end</span>
              <span className="badge">No Logs</span>
            </div>
          </div>

          <VideoChat
            onPartnerChange={setPartnerId}
            onStatus={handleStatus}
            onError={handleError}
            panicFlag={panicFlag}
          />
        </section>

        <section>
          <ChatPanel partnerId={partnerId} />
          <ControlsBar
            partnerId={partnerId}
            onReport={reportUser}
            onPanic={triggerPanic}
          />
        </section>
      </main>
    </div>
  );
};

const App = () => (
  <SocketProvider>
    <MainApp />
  </SocketProvider>
);

export default A