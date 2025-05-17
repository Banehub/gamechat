import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import styles from '../styles/groupCall.module.css';
import webrtcService from '../services/webrtc';

export default function GroupCall() {
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const peerConnections = useRef(new Map());

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
      auth: {
        userId: currentUser.id,
        username: currentUser.username
      },
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    // Join group call room
    newSocket.emit('join_group_call', 'testgroup');

    // Handle new participants
    newSocket.on('group_participant_joined', async ({ userId, username }) => {
      setParticipants(prev => [...prev, { id: userId, username }]);
      if (userId !== currentUser.id) {
        await createPeerConnection(userId);
      }
    });

    // Handle participant leaving
    newSocket.on('group_participant_left', ({ userId }) => {
      setParticipants(prev => prev.filter(p => p.id !== userId));
      if (peerConnections.current.has(userId)) {
        peerConnections.current.get(userId).close();
        peerConnections.current.delete(userId);
      }
    });

    // Handle incoming streams
    newSocket.on('group_call_offer', async ({ offer, from }) => {
      await handleIncomingCall(offer, from);
    });

    newSocket.on('group_call_answer', async ({ answer, from }) => {
      const pc = peerConnections.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    newSocket.on('group_ice_candidate', async ({ candidate, from }) => {
      const pc = peerConnections.current.get(from);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // Handle chat messages
    newSocket.on('group_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Initialize local stream and join
    initializeLocalStream();

    return () => {
      newSocket.emit('leave_group_call', 'testgroup');
      newSocket.close();
      // Clean up all peer connections
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeLocalStream = async () => {
    try {
      const stream = await webrtcService.startLocalStream();
      setLocalStream(stream);
      // Notify others that we've joined
      socket?.emit('group_participant_joined', {
        userId: currentUser.id,
        username: currentUser.username
      });
    } catch (error) {
      console.error('Error initializing local stream:', error);
    }
  };

  const createPeerConnection = async (userId) => {
    try {
      const pc = new RTCPeerConnection(webrtcService.getIceServers());
      peerConnections.current.set(userId, pc);

      // Add local stream
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('group_ice_candidate', {
            candidate: event.candidate,
            to: userId
          });
        }
      };

      // Handle incoming stream
      pc.ontrack = (event) => {
        setParticipants(prev => prev.map(p => {
          if (p.id === userId) {
            return { ...p, stream: event.streams[0] };
          }
          return p;
        }));
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('group_call_offer', {
        offer,
        to: userId
      });
    } catch (error) {
      console.error('Error creating peer connection:', error);
    }
  };

  const handleIncomingCall = async (offer, from) => {
    try {
      const pc = new RTCPeerConnection(webrtcService.getIceServers());
      peerConnections.current.set(from, pc);

      // Add local stream
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('group_ice_candidate', {
            candidate: event.candidate,
            to: from
          });
        }
      };

      // Handle incoming stream
      pc.ontrack = (event) => {
        setParticipants(prev => prev.map(p => {
          if (p.id === from) {
            return { ...p, stream: event.streams[0] };
          }
          return p;
        }));
      };

      // Set remote description and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('group_call_answer', {
        answer,
        to: from
      });
    } catch (error) {
      console.error('Error handling incoming call:', error);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      content: newMessage,
      sender: currentUser.id,
      senderName: currentUser.username,
      timestamp: new Date().toISOString()
    };

    socket.emit('group_message', message);
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={styles.groupCallContainer}>
      <div className={styles.videoGrid}>
        {participants.map((participant) => (
          <div key={participant.id} className={styles.videoContainer}>
            <video
              autoPlay
              playsInline
              muted={participant.id === currentUser.id}
              ref={(video) => {
                if (video && participant.stream) {
                  video.srcObject = participant.stream;
                }
              }}
            />
            <div className={styles.participantName}>{participant.username}</div>
          </div>
        ))}
      </div>
      <div className={styles.chatContainer}>
        <div className={styles.messages}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`${styles.message} ${
                message.sender === currentUser.id ? styles.sent : styles.received
              }`}
            >
              <div className={styles.messageSender}>{message.senderName}</div>
              <div className={styles.messageContent}>{message.content}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={sendMessage} className={styles.messageInput}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
} 