import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import styles from '../styles/chat.module.css';
import VideoCallModal from './VideoCallModal';
import IncomingCallModal from './IncomingCallModal';
import GroupChatModal from './GroupChatModal';
import webrtcService from '../services/webrtc';

export default function Chat({ selectedUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [groupParticipants, setGroupParticipants] = useState([]);
  const messagesEndRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const isGroupChat = selectedUser?._id === 'group';

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
      auth: {
        userId: currentUser.id
      }
    });
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    if (isGroupChat) {
      // Join group chat room
      socket.emit('join_group_chat', 'general');
      
      // Listen for group messages
      socket.on('group_message', (message) => {
        setMessages(prev => [...prev, message]);
      });

      // Listen for participant updates
      socket.on('group_participants_update', (participants) => {
        setGroupParticipants(participants);
      });

      // Fetch group chat history
      fetchGroupChatHistory();
    } else {
      // Join private chat room
      const roomId = [currentUser.id, selectedUser._id].sort().join('-');
      socket.emit('join_room', roomId);

      // Listen for new messages
      socket.on('receive_message', (message) => {
        setMessages(prev => [...prev, message]);
      });

      // WebRTC signaling
      socket.on('call_offer', async ({ offer, from }) => {
        console.log('Received call offer from:', from);
        try {
          setIncomingCall({ offer, from });
        } catch (error) {
          console.error('Error handling call offer:', error);
        }
      });

      socket.on('call_answer', async (answer) => {
        try {
          await webrtcService.handleAnswer(answer);
        } catch (error) {
          console.error('Error handling call answer:', error);
        }
      });

      socket.on('ice_candidate', async (candidate) => {
        try {
          await webrtcService.addIceCandidate(candidate);
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      });

      socket.on('call_declined', () => {
        endCall();
      });

      // Fetch chat history
      fetchChatHistory(selectedUser._id);
    }

    return () => {
      if (isGroupChat) {
        socket.emit('leave_group_chat', 'general');
        socket.off('group_message');
        socket.off('group_participants_update');
      } else {
        socket.emit('leave_room', roomId);
        socket.off('receive_message');
        socket.off('call_offer');
        socket.off('call_answer');
        socket.off('ice_candidate');
        socket.off('call_declined');
      }
    };
  }, [socket, selectedUser]);

  const startCall = async () => {
    if (isGroupChat) return; // Don't allow calls in group chat
    
    try {
      await webrtcService.initializePeerConnection();
      webrtcService.setOnTrack((stream) => {
        setRemoteStream(stream);
      });
      webrtcService.setOnIceCandidate((candidate) => {
        socket.emit('ice_candidate', { candidate, to: selectedUser._id });
      });

      const stream = await webrtcService.startLocalStream();
      setLocalStream(stream);

      const offer = await webrtcService.createOffer();
      socket.emit('call_offer', { offer, to: selectedUser._id, from: currentUser });
      setIsInCall(true);
    } catch (error) {
      console.error('Error starting call:', error);
    }
  };

  const handleAcceptCall = async () => {
    try {
      await webrtcService.initializePeerConnection();
      webrtcService.setOnTrack((stream) => {
        setRemoteStream(stream);
      });
      webrtcService.setOnIceCandidate((candidate) => {
        socket.emit('ice_candidate', { candidate, to: incomingCall.from.id });
      });

      const stream = await webrtcService.startLocalStream();
      setLocalStream(stream);

      const answer = await webrtcService.handleOffer(incomingCall.offer);
      socket.emit('call_answer', { answer, to: incomingCall.from.id });
      setIsInCall(true);
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  const handleDeclineCall = () => {
    if (incomingCall) {
      socket.emit('call_declined', { to: incomingCall.from.id });
      setIncomingCall(null);
    }
  };

  const endCall = () => {
    webrtcService.close();
    setLocalStream(null);
    setRemoteStream(null);
    setIsInCall(false);
    setIncomingCall(null);
  };

  const toggleVideo = async (enabled) => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  };

  const toggleAudio = async (enabled) => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  };

  const toggleScreenShare = async (enabled) => {
    try {
      if (enabled) {
        await webrtcService.startScreenShare();
      } else {
        await webrtcService.stopScreenShare();
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

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

  const fetchGroupChatHistory = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/group/general`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching group chat history:', error);
    }
  };

  const sendMessage = async (message) => {
    if (!message.trim() || !selectedUser) return;

    if (isGroupChat) {
      const messageData = {
        content: message,
        sender: currentUser.id,
        senderName: currentUser.username,
        roomId: 'general',
        timestamp: new Date().toISOString()
      };

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/group`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(messageData)
        });

        if (response.ok) {
          const newMessage = await response.json();
          setMessages(prev => [...prev, newMessage]);
          socket.emit('group_message', newMessage);
        }
      } catch (error) {
        console.error('Error sending group message:', error);
      }
    } else {
      const messageData = {
        content: message,
        sender: currentUser.id,
        receiver: selectedUser._id,
        roomId: [currentUser.id, selectedUser._id].sort().join('-')
      };

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(messageData)
        });

        if (response.ok) {
          const newMessage = await response.json();
          setMessages(prev => [...prev, newMessage]);
          socket.emit('send_message', newMessage);
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
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

  if (isGroupChat) {
    return (
      <GroupChatModal
        messages={messages}
        onSendMessage={sendMessage}
        participants={groupParticipants}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div className={styles.chatContainer}>
      {isInCall && (
        <VideoCallModal
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={endCall}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onToggleScreenShare={toggleScreenShare}
        />
      )}
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall.from}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}
      <div className={styles.messagesContainer}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`${styles.message} ${
              message.sender === currentUser.id ? styles.sent : styles.received
            }`}
          >
            <div className={styles.messageContent}>{message.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className={styles.inputContainer}>
        <form onSubmit={(e) => {
          e.preventDefault();
          sendMessage(newMessage);
          setNewMessage('');
        }}>
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
        {!isInCall && (
          <button onClick={startCall} className={styles.callButton}>
            Start Video Call
          </button>
        )}
      </div>
    </div>
  );
} 