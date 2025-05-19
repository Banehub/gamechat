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
    
    // Notify all participants in the group
    io.to(groupId).emit('group_participant_joined', {
      userId,
      username: socket.handshake.auth.username
    });
  });

  socket.on('leave_group_call', (groupId) => {
    socket.leave(groupId);
    if (groupParticipants.has(groupId)) {
      groupParticipants.get(groupId).delete(userId);
      // Notify all participants in the group
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
    
    // Notify all participants in the group chat
    io.to(roomId).emit('group_participants_update', 
      Array.from(groupChatParticipants.get(roomId).values())
    );
  });

  socket.on('leave_group_chat', (roomId) => {
    socket.leave(roomId);
    if (groupChatParticipants.has(roomId)) {
      groupChatParticipants.get(roomId).delete(userId);
      // Notify all participants in the group chat
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