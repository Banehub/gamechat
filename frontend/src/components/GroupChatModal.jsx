import { useState, useEffect, useRef } from 'react';
import styles from '../styles/groupChatModal.module.css';

export default function GroupChatModal({ messages = [], onSendMessage, participants = [], currentUser }) {
    const [newMessage, setNewMessage] = useState('');
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [permissionError, setPermissionError] = useState('');
    const [localStream, setLocalStream] = useState(null);
    const [participantStreams, setParticipantStreams] = useState({});
    const [videoStats, setVideoStats] = useState({});
    const localVideoRef = useRef(null);
    const statsIntervalRef = useRef(null);

    useEffect(() => {
        requestPermissions();
        return () => {
            // Cleanup streams when component unmounts
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            Object.values(participantStreams).forEach(stream => {
                stream.getTracks().forEach(track => track.stop());
            });
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
            }
        };
    }, []);

    // Update local video when stream is available
    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
            // Ensure the video plays
            localVideoRef.current.play().catch(error => {
                console.error('Error playing video:', error);
            });

            // Start collecting video stats
            startVideoStats();
        }
    }, [localStream]);

    const startVideoStats = () => {
        if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
        }

        statsIntervalRef.current = setInterval(() => {
            if (localVideoRef.current) {
                const videoTrack = localStream?.getVideoTracks()[0];
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
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                }, 
                audio: true 
            });
            setLocalStream(stream);

            // Request notification permission
            await Notification.requestPermission();

            setPermissionsGranted(true);
            setPermissionError('');
        } catch (error) {
            console.error('Error requesting permissions:', error);
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
                            {participants.length} Online
                        </span>
                        <div className={styles.participantList}>
                            {participants.map((participant) => (
                                <div key={participant.id} className={styles.participant}>
                                    <span className={styles.status}></span>
                                    <span className={styles.name}>{participant.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={styles.videoGrid}>
                    {/* Local user's video */}
                    <div className={styles.videoContainer}>
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className={styles.video}
                        />
                        <div className={styles.videoLabel}>You</div>
                        {videoStats && (
                            <div className={styles.videoStats}>
                                <span>{videoStats.quality}</span>
                                <span>{Math.round(videoStats.frameRate)}fps</span>
                            </div>
                        )}
                    </div>

                    {/* Other participants' videos */}
                    {participants.map((participant) => (
                        <div key={participant.id} className={styles.videoContainer}>
                            <video
                                autoPlay
                                playsInline
                                className={styles.video}
                            />
                            <div className={styles.videoLabel}>{participant.username}</div>
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