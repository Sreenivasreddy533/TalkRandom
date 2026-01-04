import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";

const ChatPanel = ({ partnerId }) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = ({ from, message, sentAt }) => {
      setMessages((prev) => [
        ...prev,
        { id: `${sentAt}-${from}`, from, text: message, ts: sentAt }
      ]);
    };

    socket.on("chat-message", handleMessage);
    return () => socket.off("chat-message");
  }, [socket]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !socket || !partnerId) return;
    const text = input.trim();
    const ts = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `self-${ts}`, from: socket.id, text, ts }
    ]);
    socket.emit("chat-message", { to: partnerId, message: text });
    setInput("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="card chat-container">
      <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
        💬 Chat
      </div>

      <div ref={containerRef} className="chat-messages">
        {messages.length === 0 && (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.85rem",
              opacity: 0.6
            }}
          >
            👋 Say hi while connecting!
          </div>
        )}
        {messages.map((m) => {
          const isSelf = socket && m.from === socket.id;
          return (
            <div key={m.id} className={`chat-message ${isSelf ? "self" : ""}`}>
              <div className={`chat-bubble ${isSelf ? "self" : "other"}`}>
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="chat-input-row">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={partnerId ? "Type message (Shift+Enter for new line)…" : "Start chat"}
        />
        <button
          className="btn btn-primary"
          disabled={!partnerId || !input.trim()}
          onClick={sendMessage}
          style={{ alignSelf: "flex-end" }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
