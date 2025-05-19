require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./src/routes/auth');
const messageRoutes = require('./src/routes/messages');

const app = express();

// Environment variables with defaults
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://williefbeukes:dAZlNQUZCBcKBi58@cluster0.ra02y7n.mongodb.net/gamechat';

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5174',
    'http://localhost:5173',
    'http://localhost:5000',
    'http://13.61.19.146'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(express.json());
app.use(cors(corsOptions));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOptions.origin,
    methods: corsOptions.methods,
    credentials: corsOptions.credentials
  }
});

// Request logging middleware
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Basic route for testing
app.get('/api', (req, res) => {
  res.json({ message: 'GameChat Backend API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    availableRoutes: ['/api/auth/register', '/api/auth/login', '/api/messages']
  });
});

// Store user socket mappings
const userSockets = new Map();
// Store group call participants
const groupParticipants = new Map();
// Store group chat participants
const groupChatParticipants = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Store the user's socket mapping
  const userId = socket.handshake.auth.userId;
  const username = socket.handshake.auth.username;
  if (userId) {
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} mapped to socket ${socket.id}`);
  }

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  socket.on('send_message', (message) => {
    const roomId = message.roomId;
    io.to(roomId).emit('receive_message', message);
  });

  // Group call handling
  socket.on('join_group_call', (groupId) => {
    socket.join(groupId);
    if (!groupParticipants.has(groupId)) {
      groupParticipants.set(groupId, new Set());
    }
    groupParticipants.get(groupId).add(userId);
    
    io.to(groupId).emit('group_participant_joined', {
      userId,
      username: socket.handshake.auth.username
    });
  });

  socket.on('leave_group_call', (groupId) => {
    socket.leave(groupId);
    if (groupParticipants.has(groupId)) {
      groupParticipants.get(groupId).delete(userId);
      io.to(groupId).emit('group_participant_left', { userId });
    }
  });

  socket.on('group_message', (message) => {
    const groupId = message.groupId;
    io.to(groupId).emit('group_message', message);
  });

  // WebRTC signaling for group calls
  socket.on('group_call_offer', ({ offer, to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('group_call_offer', {
        offer,
        from: userId
      });
    }
  });

  socket.on('group_call_answer', ({ answer, to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('group_call_answer', {
        answer,
        from: userId
      });
    }
  });

  socket.on('group_ice_candidate', ({ candidate, to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('group_ice_candidate', {
        candidate,
        from: userId
      });
    }
  });

  // Individual call signaling
  socket.on('call_offer', ({ offer, to, from }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_offer', { offer, from });
    }
  });

  socket.on('call_answer', ({ answer, to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_answer', answer);
    }
  });

  socket.on('ice_candidate', ({ candidate, to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice_candidate', candidate);
    }
  });

  socket.on('call_declined', ({ to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_declined');
    }
  });

  // Group chat handling
  socket.on('join_group_chat', (roomId) => {
    socket.join(roomId);
    if (!groupChatParticipants.has(roomId)) {
      groupChatParticipants.set(roomId, new Map());
    }
    groupChatParticipants.get(roomId).set(userId, {
      id: userId,
      username: username,
      socketId: socket.id
    });
    
    io.to(roomId).emit('group_participants_update', 
      Array.from(groupChatParticipants.get(roomId).values())
    );
  });

  socket.on('leave_group_chat', (roomId) => {
    socket.leave(roomId);
    if (groupChatParticipants.has(roomId)) {
      groupChatParticipants.get(roomId).delete(userId);
      io.to(roomId).emit('group_participants_update', 
        Array.from(groupChatParticipants.get(roomId).values())
      );
    }
  });

  socket.on('disconnect', () => {
    // Remove user from all group chats
    groupChatParticipants.forEach((participants, roomId) => {
      if (participants.has(userId)) {
        participants.delete(userId);
        io.to(roomId).emit('group_participants_update', 
          Array.from(participants.values())
        );
      }
    });
    
    // Remove user from all group calls
    groupParticipants.forEach((participants, groupId) => {
      if (participants.has(userId)) {
        participants.delete(userId);
        io.to(groupId).emit('group_participant_left', { userId });
      }
    });

    // Remove socket mapping
    if (userId) {
      userSockets.delete(userId);
    }
    console.log('User disconnected:', socket.id);
  });
});

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB Atlas');
  // Create indexes for better performance
  mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
  mongoose.connection.db.collection('users').createIndex({ username: 1 }, { unique: true });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 