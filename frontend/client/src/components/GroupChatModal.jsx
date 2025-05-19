import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import styles from '../styles/groupChatModal.module.css';
import webrtcService from '../services/webrtc';
import { useNavigate } from 'react-router-dom';

export default function GroupChatModal({ messages = [], onSendMessage, participants = [], currentUser }) {
    const [newMessage, setNewMessage] = useState('');
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [permissionError, setPermissionError] = useState('');
    const [localStream, setLocalStream] = useState(null);
    const [videoStats, setVideoStats] = useState({});
    const [videoParticipants, setVideoParticipants] = useState([]);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [localVolume, setLocalVolume] = useState(0);
    const localVideoRef = useRef(null);
    const statsIntervalRef = useRef(null);
    const socketRef = useRef(null);
    const peerConnections = useRef(new Map());
    const roomId = 'general';
    const navigate = useNavigate();

    // Request permissions when component mounts
    useEffect(() => {
        const requestPermissions = async () => {
            try {
                console.log('Requesting media permissions...');
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user'
                    }, 
                    audio: true 
                });
                console.log('Media permissions granted, stream:', stream);
                setLocalStream(stream);
                setPermissionsGranted(true);
                if (localVideoRef.current) {
                    console.log('Setting local video stream');
                    localVideoRef.current.srcObject = stream;
                    // Force video to play
                    localVideoRef.current.play().catch(e => console.error('Error playing video:', e));
                } else {
                    console.warn('localVideoRef is not available');
                }
            } catch (error) {
                console.error('Error accessing media devices:', error);
                setPermissionError(`Please allow camera and microphone access to join the video chat. Error: ${error.message}`);
            }
        };
        requestPermissions();
    }, []);

    // Add effect to handle video element
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            console.log('Setting up video element with stream');
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(e => console.error('Error playing video:', e));
        }
    }, [localStream]);

    // Sound meter for local audio
    useEffect(() => {
        if (!localStream) return;
        let audioContext;
        let analyser;
        let dataArray;
        let source;
        let animationId;

        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            source = audioContext.createMediaStreamSource(localStream);
            source.connect(analyser);

            const updateVolume = () => {
                analyser.getByteTimeDomainData(dataArray);
                // Calculate RMS (root mean square) volume
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const val = (dataArray[i] - 128) / 128;
                    sum += val * val;
                }
                const rms = Math.sqrt(sum / dataArray.length);
                setLocalVolume(rms);
                animationId = requestAnimationFrame(updateVolume);
            };
            updateVolume();
        } catch (e) {
            console.error('Error setting up local sound meter:', e);
        }

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (source) source.disconnect();
            if (analyser) analyser.disconnect();
            if (audioContext) audioContext.close();
        };
    }, [localStream]);

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
    }, [permissionsGranted]);

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

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    };

    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    };

    const toggleScreenShare = async () => {
        try {
            if (!isScreenSharing) {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const videoTrack = screenStream.getVideoTracks()[0];
                
                // Replace video track in all peer connections
                peerConnections.current.forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });

                // Update local stream
                const newStream = new MediaStream([
                    ...localStream.getAudioTracks(),
                    videoTrack
                ]);
                setLocalStream(newStream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = newStream;
                }

                // Handle when user stops sharing
                videoTrack.onended = () => {
                    toggleScreenShare();
                };

                setIsScreenSharing(true);
            } else {
                // Restore original video track
                const originalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                const videoTrack = originalStream.getVideoTracks()[0];

                peerConnections.current.forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });

                setLocalStream(originalStream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = originalStream;
                }

                setIsScreenSharing(false);
            }
        } catch (error) {
            console.error('Error toggling screen share:', error);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        onSendMessage(newMessage);
        setNewMessage('');
    };

    // Exit handler
    const handleExit = () => {
        if (socketRef.current) {
            socketRef.current.emit('leave_group_call', roomId);
            socketRef.current.close();
        }
        // Optionally clean up streams
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        navigate('/dashboard');
    };

    return (
        <div className={styles.modalContainer}>
            <div className={styles.videoGrid}>
                {/* Local video */}
                <div className={styles.videoContainer} style={{ background: '#222', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    {localStream ? (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={styles.video}
                            style={{ transform: 'scaleX(-1)' }}
                        />
                    ) : (
                        <div style={{ color: '#888', textAlign: 'center' }}>
                            <div>No camera feed</div>
                            <div style={{ fontSize: 12 }}>Check camera permissions and console for errors.</div>
                        </div>
                    )}
                    <div className={styles.participantName}>
                        {currentUser.username} (You)
                    </div>
                    {/* Sound meter bar */}
                    <div className={styles.soundMeterBar}>
                        <div
                            className={styles.soundMeterLevel}
                            style={{ width: `${Math.min(localVolume * 100, 100)}%` }}
                        />
                    </div>
                    <div style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 2 }}>
                        Mic Level
                    </div>
                </div>

                {/* Remote videos */}
                {videoParticipants.map((participant) => (
                    <div key={participant.id} className={styles.videoContainer}>
                        <video
                            autoPlay
                            playsInline
                            ref={(video) => {
                                if (video && participant.stream) {
                                    video.srcObject = participant.stream;
                                }
                            }}
                            className={styles.video}
                        />
                        <div className={styles.participantName}>
                            {participant.username}
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.controls}>
                <button
                    onClick={toggleVideo}
                    className={`${styles.controlButton} ${!isVideoEnabled ? styles.disabled : ''}`}
                >
                    {isVideoEnabled ? '📹' : '🚫'}
                </button>
                <button
                    onClick={toggleAudio}
                    className={`${styles.controlButton} ${!isAudioEnabled ? styles.disabled : ''}`}
                >
                    {isAudioEnabled ? '🎤' : '🔇'}
                </button>
                <button
                    onClick={toggleScreenShare}
                    className={`${styles.controlButton} ${isScreenSharing ? styles.active : ''}`}
                >
                    {isScreenSharing ? '🖥️' : '📺'}
                </button>
                {/* Mute button (toggles audio) */}
                <button
                    onClick={toggleAudio}
                    className={`${styles.controlButton} ${!isAudioEnabled ? styles.disabled : ''}`}
                    title={isAudioEnabled ? 'Mute Myself' : 'Unmute Myself'}
                >
                    {isAudioEnabled ? '🔇 Mute' : '🎤 Unmute'}
                </button>
                {/* Exit button */}
                <button
                    onClick={handleExit}
                    className={styles.controlButton}
                    style={{ background: '#ff4444', color: 'white' }}
                    title="Exit Group Chat"
                >
                    🚪 Exit
                </button>
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
                </div>
                <form onSubmit={handleSendMessage} className={styles.messageInput}>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                    />
                    <button type="submit">Send</button>
                </form>
            </div>

            {permissionError && (
                <div className={styles.permissionError}>
                    {permissionError}
                </div>
            )}
        </div>
    );
} 