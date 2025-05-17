require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);

// Environment variables with defaults
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://williefbeukes:dAZlNQUZCBcKBi58@cluster0.ra02y7n.mongodb.net/gamechat';

// Log environment configuration
console.log('Environment Configuration:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL,
  PORT,
  MONGODB_URI: MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//****:****@'), // Hide credentials
});

const allowedOrigins = [
  FRONTEND_URL,
  "https://gamechat-3-front-end.onrender.com",
  "http://localhost:5173"
];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Basic middleware
app.use(express.json());
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('Blocked by CORS:', origin);
      return callback(new Error('Not allowed by CORS'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

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
console.log('Mounting auth routes at /api/auth');
app.use('/api/auth', authRoutes);

console.log('Mounting message routes at /api/messages');
app.use('/api/messages', messageRoutes);

// Basic route for testing
app.get('/api', (req, res) => {
  res.json({ message: 'GameChat Backend API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Request details:', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  });
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// 404 handler - must be last
app.use('*', (req, res) => {
  console.log('404 - Route not found:', {
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    method: req.method,
    headers: req.headers
  });
  res.status(404).json({ 
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    availableRoutes: ['/api/auth/register', '/api/auth/login', '/api/messages']
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
  process.exit(1); // Exit if cannot connect to database
});

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`User left room: ${roomId}`);
  });

  socket.on('send_message', (message) => {
    // Broadcast the message to all users in the room
    io.to(message.roomId).emit('receive_message', message);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 

