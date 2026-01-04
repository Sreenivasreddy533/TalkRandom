import React, { useState } from "react";
import { useSocket } from "../context/SocketContext";

const ControlsBar = ({ partnerId, onReport, onPanic }) => {
  const { connected } = useSocket();
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState([]);
  const [language, setLanguage] = useState("en");

  const handleAddInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !interests.includes(trimmed.toLowerCase())) {
      setInterests([...interests, trimmed.toLowerCase()]);
    }
    setInterestInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddInterest();
    }
  };

  return (
    <div
      className="card"
      style={{
        marginTop: "1rem",
        fontSize: "0.85rem"
      }}
    >
      <div style={{ marginBottom: "0.75rem" }}>
        <strong>🎯 Interests & Preferences</strong>
      </div>

      <div className="interests-row">
        <span style={{ opacity: 0.8 }}>Add interests:</span>
        <input
          type="text"
          className="interest-input"
          value={interestInput}
          onChange={(e) => setInterestInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g. gaming"
        />
        <button className="btn btn-ghost" style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem" }} onClick={handleAddInterest}>
          ➕ Add
        </button>
      </div>

      {interests.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {interests.map((tag) => (
            <span
              key={tag}
              className="interest-tag"
              onClick={() => setInterests(interests.filter((t) => t !== tag))}
            >
              #{tag} ✕
            </span>
          ))}
        </div>
      )}

      <div className="interests-row">
        <span>Language:</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            padding: "0.2rem 0.5rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--border)",
            background: "var(--bg-alt)",
            color: "var(--fg)"
          }}
        >
          <option value="en">🇬🇧 English</option>
          <option value="hi">🇮🇳 Hindi</option>
          <option value="te">🇮🇳 Telugu</option>
          <option value="es">🇪🇸 Spanish</option>
        </select>
      </div>

      <div className="controls-row" style={{ marginTop: "0.75rem" }}>
        <button
          className="btn btn-ghost"
          disabled={!partnerId}
          onClick={onReport}
        >
          🚩 Report
        </button>
        <button
          className="btn btn-danger"
          disabled={!partnerId}
          onClick={onPanic}
          style={{ marginLeft: "auto" }}
        >
          🚨 Panic
        </button>
      </div>

      <div
        style={{
          marginTop: "1rem",
          padding: "0.75rem",
          borderRadius: "0.75rem",
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          fontSize: "0.75rem"
        }}
      >
        <strong>⚠️ Safety Rules:</strong>
        <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1rem", opacity: 0.9 }}>
          <li>No nudity or illegal content</li>
          <li>Never share personal information</li>
          <li>Use Report/Panic if uncomfortable</li>
        </ul>
      </div>
    </div>
  );
};

export default ControlsBar;
