const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { v4: uuid } = require("uuid");

const { PORT, CLIENT_ORIGIN } = require("./config");
const matchmaking = require("./matchmaking");

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Omegle Clone Server Running" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] }
});

const users = new Map();

io.on("connection", (socket) => {
  const userId = uuid();
  users.set(socket.id, { id: userId, createdAt: Date.now(), isBanned: false });

  console.log("✅ User connected:", socket.id);

  socket.on("age-confirm", (payload) => {
    console.log("✅ Age confirmed:", socket.id);
  });

  socket.on("find-partner", (meta) => {
    if (!users.has(socket.id)) return;
    const user = users.get(socket.id);
    if (user.isBanned) {
      socket.emit("error-message", { message: "You are banned." });
      return;
    }

    matchmaking.clear(socket.id);

    const candidate = {
      socketId: socket.id,
      interests: meta?.interests || [],
      language: meta?.language || null
    };

    const partnerId = matchmaking.findPartner(candidate);
    if (partnerId) {
      socket.emit("match-found", { partnerId });
      io.to(partnerId).emit("match-found", { partnerId: socket.id });
      console.log("✅ Match:", socket.id, "↔", partnerId);
    } else {
      matchmaking.addToQueue(socket.id, candidate);
      socket.emit("waiting");
    }
  });

  // WebRTC Signaling
  socket.on("webrtc-offer", ({ to, sdp }) => {
    io.to(to).emit("webrtc-offer", { from: socket.id, sdp });
  });

  socket.on("webrtc-answer", ({ to, sdp }) => {
    io.to(to).emit("webrtc-answer", { from: socket.id, sdp });
  });

  socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("webrtc-ice-candidate", { from: socket.id, candidate });
  });

  // Chat
  socket.on("chat-message", ({ to, message }) => {
    io.to(to).emit("chat-message", {
      from: socket.id,
      message,
      sentAt: Date.now()
    });
  });

  // Controls
  socket.on("disconnect-partner", () => {
    const partnerId = matchmaking.endPair(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("partner-disconnected");
    }
  });

  socket.on("report-user", ({ targetId, reason }) => {
    const count = matchmaking.addReport(targetId);
    console.log("⚠️ Report #" + count + " against", targetId, "reason:", reason);

    if (count >= 3 && users.has(targetId)) {
      const target = users.get(targetId);
      target.isBanned = true;
      users.set(targetId, target);
      const partnerId = matchmaking.endPair(targetId);
      if (partnerId) {
        io.to(partnerId).emit("partner-disconnected");
      }
    }
  });

  socket.on("panic", () => {
    const partnerId = matchmaking.getPartner(socket.id);
    if (partnerId) {
      matchmaking.addReport(partnerId);
      io.to(partnerId).emit("partner-disconnected");
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    const partnerId = matchmaking.clear(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("partner-disconnected");
    }
    users.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
