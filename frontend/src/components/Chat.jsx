import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import styles from '../styles/chat.module.css';

export default function Chat({ selectedUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true
    });
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    // Join private chat room
    const roomId = [currentUser.id, selectedUser._id].sort().join('-');
    socket.emit('join_room', roomId);

    // Listen for new messages
    socket.on('receive_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Fetch chat history
    fetchChatHistory(selectedUser._id);

    return () => {
      socket.emit('leave_room', roomId);
      socket.off('receive_message');
    };
  }, [socket, selectedUser]);

  const fetchChatHistory = async (userId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const messageData = {
      content: newMessage,
      sender: currentUser.id,
      receiver: selectedUser._id,
      roomId: [currentUser.id, selectedUser._id].sort().join('-')
    };

    try {
      // Send message to server
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        socket.emit('send_message', message);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!selectedUser) {
    return (
      <div className={styles.chatContainer}>
        <div className={styles.noChat}>
          <p>Select a user to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <h2>Chat with {selectedUser.username}</h2>
      </div>
      
      <div className={styles.messagesContainer}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`${styles.message} ${
              message.sender === currentUser.id ? styles.sent : styles.received
            }`}
          >
            <div className={styles.messageContent}>
              {message.content}
            </div>
            <div className={styles.messageTime}>
              {new Date(message.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className={styles.messageForm}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className={styles.messageInput}
        />
        <button type="submit" className={styles.sendButton}>
          Send
        </button>
      </form>
    </div>
  );
} 