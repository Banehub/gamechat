import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import styles from '../styles/groupChatModal.module.css';
import webrtcService from '../services/webrtc';

export default function GroupChatModal({ messages = [], onSendMessage, participants = [], currentUser }) {
    const [newMessage, setNewMessage] = useState('');
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [permissionError, setPermissionError] = useState('');
    const [localStream, setLocalStream] = useState(null);
    const [videoStats, setVideoStats] = useState({});
    const [videoParticipants, setVideoParticipants] = useState([]); // {id, username, stream}
    const localVideoRef = useRef(null);
    const statsIntervalRef = useRef(null);
    const socketRef = useRef(null);
    const peerConnections = useRef(new Map());
    const roomId = 'general';

    useEffect(() => {
        if (!permissionsGranted) return;
        // Initialize socket connection for group call
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            withCredentials: true,
            auth: {
                userId: currentUser.id,
                username: currentUser.username
            },
            transports: ['websocket', 'polling']
        });
        socketRef.current = socket;

        // Join group call room
        socket.emit('join_group_call', roomId);

        // Handle new participants
        socket.on('group_participant_joined', async ({ userId, username }) => {
            setVideoParticipants(prev => {
                if (prev.find(p => p.id === userId)) return prev;
                return [...prev, { id: userId, username }];
            });
            if (userId !== currentUser.id) {
                await createPeerConnection(userId);
            }
        });

        // Handle participant leaving
        socket.on('group_participant_left', ({ userId }) => {
            setVideoParticipants(prev => prev.filter(p => p.id !== userId));
            if (peerConnections.current.has(userId)) {
                peerConnections.current.get(userId).close();
                peerConnections.current.delete(userId);
            }
        });

        // Handle incoming streams
        socket.on('group_call_offer', async ({ offer, from }) => {
            await handleIncomingCall(offer, from);
        });

        socket.on('group_call_answer', async ({ answer, from }) => {
            const pc = peerConnections.current.get(from);
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        socket.on('group_ice_candidate', async ({ candidate, from }) => {
            const pc = peerConnections.current.get(from);
            if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        // Initialize local stream and notify others
        initializeLocalStream();

        return () => {
            socket.emit('leave_group_call', roomId);
            socket.close();
            // Clean up all peer connections
            peerConnections.current.forEach(pc => pc.close());
            peerConnections.current.clear();
            // Stop local stream
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
            }
        };
        // eslint-disable-next-line
    }, [permissionsGranted]);

    const initializeLocalStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
                audio: true
            });
            setLocalStream(stream);
            setVideoParticipants(prev => {
                if (prev.find(p => p.id === currentUser.id)) return prev;
                return [{ id: currentUser.id, username: currentUser.username, stream }, ...prev];
            });
            // Notify others that we've joined
            socketRef.current?.emit('group_participant_joined', {
                userId: currentUser.id,
                username: currentUser.username
            });
            startVideoStats(stream);
        } catch (error) {
            setPermissionError('Could not access camera/microphone.');
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
                    socketRef.current.emit('group_ice_candidate', {
                        candidate: event.candidate,
                        to: userId
                    });
                }
            };

            // Handle incoming stream
            pc.ontrack = (event) => {
                setVideoParticipants(prev => prev.map(p => {
                    if (p.id === userId) {
                        return { ...p, stream: event.streams[0] };
                    }
                    return p;
                }));
            };

            // Create and send offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current.emit('group_call_offer', {
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
                    socketRef.current.emit('group_ice_candidate', {
                        candidate: event.candidate,
                        to: from
                    });
                }
            };

            // Handle incoming stream
            pc.ontrack = (event) => {
                setVideoParticipants(prev => prev.map(p => {
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
            socketRef.current.emit('group_call_answer', {
                answer,
                to: from
            });
        } catch (error) {
            console.error('Error handling incoming call:', error);
        }
    };

    const startVideoStats = (stream) => {
        if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
        }
        statsIntervalRef.current = setInterval(() => {
            const videoTrack = stream?.getVideoTracks()[0];
            if (videoTrack) {
                const settings = videoTrack.getSettings();
                const stats = {
                    width: settings.width,
                    height: settings.height,
                    frameRate: settings.frameRate,
                    quality: getVideoQuality(settings.width, settings.height)
                };
                setVideoStats(stats);
            }
        }, 1000);
    };

    const getVideoQuality = (width, height) => {
        if (width >= 3840 || height >= 2160) return '4K';
        if (width >= 2560 || height >= 1440) return '1440p';
        if (width >= 1920 || height >= 1080) return '1080p';
        if (width >= 1280 || height >= 720) return '720p';
        return 'SD';
    };

    const requestPermissions = async () => {
        try {
            // Request camera and microphone permissions together
            await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            setPermissionsGranted(true);
            setPermissionError('');
        } catch (error) {
            setPermissionError('Please grant camera and microphone permissions to join the group chat.');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage);
            setNewMessage('');
        }
    };

    if (!permissionsGranted) {
        return (
            <div className={styles.modalOverlay}>
                <div className={styles.permissionsModal}>
                    <h2>Join Group Chat</h2>
                    <p>To join the group chat, we need the following permissions:</p>
                    <ul className={styles.permissionsList}>
                        <li>📹 Camera access</li>
                        <li>🎤 Microphone access</li>
                        <li>🔔 Notifications</li>
                    </ul>
                    {permissionError && (
                        <p className={styles.error}>{permissionError}</p>
                    )}
                    <button 
                        onClick={requestPermissions}
                        className={styles.permissionButton}
                    >
                        Grant Permissions
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2>Group Chat</h2>
                        <span className={styles.roomInfo}>General Room</span>
                    </div>
                    <div className={styles.participants}>
                        <span className={styles.participantCount}>
                            {videoParticipants.length} Online
                        </span>
                        <div className={styles.participantList}>
                            {videoParticipants.map((participant) => (
                                <div key={participant.id} className={styles.participant}>
                                    <span className={styles.status}></span>
                                    <span className={styles.name}>{participant.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={styles.videoGrid}>
                    {videoParticipants.map((participant) => (
                        <div key={participant.id} className={styles.videoContainer}>
                            <video
                                autoPlay
                                playsInline
                                muted={participant.id === currentUser.id}
                                ref={video => {
                                    if (video && participant.stream) {
                                        video.srcObject = participant.stream;
                                    }
                                }}
                                className={styles.video}
                            />
                            <div className={styles.videoLabel}>{participant.id === currentUser.id ? 'You' : participant.username}</div>
                            {participant.id === currentUser.id && videoStats && (
                                <div className={styles.videoStats}>
                                    <span>{videoStats.quality}</span>
                                    <span>{Math.round(videoStats.frameRate)}fps</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                
                <div className={styles.chatArea}>
                    <div className={styles.messages}>
                        {Array.isArray(messages) && messages.map((message, index) => (
                            <div
                                key={index}
                                className={`${styles.message} ${
                                    message.sender === currentUser?.id ? styles.sent : styles.received
                                }`}
                            >
                                {message.sender !== currentUser?.id && (
                                    <div className={styles.messageSender}>{message.senderName}</div>
                                )}
                                <div className={styles.messageContent}>{message.content}</div>
                                <div className={styles.messageTime}>
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={styles.inputArea}>
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
        </div>
    );
} 