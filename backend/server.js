// Store user socket mappings
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Store the user's socket mapping
  const userId = socket.handshake.auth.userId;
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

  // WebRTC signaling
  socket.on('call_offer', ({ offer, to, from }) => {
    console.log(`Call offer from ${from.id} to ${to}`);
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_offer', { offer, from });
    } else {
      console.log(`Target user ${to} not found`);
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

  socket.on('disconnect', () => {
    // Remove user's socket mapping on disconnect
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`Removed mapping for user ${userId}`);
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
}); 