io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

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
  socket.on('call_offer', ({ offer, to }) => {
    io.to(to).emit('call_offer', offer);
  });

  socket.on('call_answer', ({ answer, to }) => {
    io.to(to).emit('call_answer', answer);
  });

  socket.on('ice_candidate', ({ candidate, to }) => {
    io.to(to).emit('ice_candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
}); 