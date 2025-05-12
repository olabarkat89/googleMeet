const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// حفظ المستخدمين داخل الغرف

const rooms = {};  // تخزين الغرف

io.on("connection", (socket) => {
//   console.log("🔌 New user connected:", socket.id,roomId, userId);

  socket.on("join-room", (roomId, userId) => {
    console.log(`📥 ${userId} joined room ${roomId}`);
    socket.join(roomId);

    // أنشئ الغرفة إذا مش موجودة
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    // أضف المستخدم لقائمة الغرفة
    rooms[roomId].push({ socketId: socket.id, userId });

    // أرسل له قائمة المستخدمين الحاليين في الغرفة
    const otherUsers = rooms[roomId].filter((u) => u.socketId !== socket.id);
    socket.emit("all-users", otherUsers);

    // أبلغ الآخرين بوجود مستخدم جديد
    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userId: userId
    });

    // عند تلقي offer -> أرسله للمستهدف
    socket.on("offer", (payload) => {
      io.to(payload.target).emit("offer", {
        sdp: payload.sdp,
        caller: socket.id
      });
    });

    socket.on("answer", (payload) => {
      io.to(payload.target).emit("answer", {
        sdp: payload.sdp,
        responder: socket.id
      });
    });

    socket.on("ice-candidate", (incoming) => {
      io.to(incoming.target).emit("ice-candidate", {
        candidate: incoming.candidate,
        from: socket.id
      });
    });

    socket.on("disconnect", () => {
      console.log(`❌ ${userId} disconnected`);
      // احذف المستخدم من الغرفة
      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter((u) => u.socketId !== socket.id);
        socket.to(roomId).emit("user-disconnected", socket.id);
      }
    });
  });
});

// io.on('connection', (socket) => {
//   console.log(`User connected: ${socket.id}`);

//   // Listen for a new user trying to enter a meeting
//   socket.on('user-join-attempt', (meetingId, userId) => {
//     // Check if the meeting exists and if there is an owner
//     const ownerId = meetingOwners[meetingId];

//     if (ownerId) {
//       // Notify the owner that a new user is attempting to join
//       io.to(ownerId).emit('new-user-attempt', { meetingId, userId });
//     }
//   });

//   // When the owner accepts or rejects the user
//   socket.on('owner-response', (meetingId, userId, accept) => {
//     // Get the user who is trying to join
//     const userSocket = meetingUsers[meetingId]?.[userId];

//     if (accept) {
//       // Add user to the meeting
//       meetingUsers[meetingId] = meetingUsers[meetingId] || {};
//       meetingUsers[meetingId][userId] = socket.id;

//       // Notify the user that they have been accepted
//       io.to(socket.id).emit('user-entered', { meetingId });
//     } else {
//       // Notify the user that they have been rejected
//       io.to(socket.id).emit('user-rejected', { meetingId });
//     }
//   });
// })

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server is running on http://localhost:${PORT}`);
});
