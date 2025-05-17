import { useState } from 'react';
import styles from '../styles/callControls.module.css';

export default function CallControls({ onStartCall, onEndCall, onToggleVideo, onToggleAudio, onToggleScreenShare }) {
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const handleVideoToggle = () => {
        setIsVideoEnabled(!isVideoEnabled);
        onToggleVideo(!isVideoEnabled);
    };

    const handleAudioToggle = () => {
        setIsAudioEnabled(!isAudioEnabled);
        onToggleAudio(!isAudioEnabled);
    };

    const handleScreenShareToggle = async () => {
        try {
            if (!isScreenSharing) {
                await onToggleScreenShare(true);
                setIsScreenSharing(true);
            } else {
                await onToggleScreenShare(false);
                setIsScreenSharing(false);
            }
        } catch (error) {
            console.error('Screen sharing error:', error);
        }
    };

    return (
        <div className={styles.callControls}>
            <button 
                className={`${styles.controlButton} ${!isVideoEnabled ? styles.disabled : ''}`}
                onClick={handleVideoToggle}
                title={isVideoEnabled ? "Disable Video" : "Enable Video"}
            >
                {isVideoEnabled ? "🎥" : "📷"}
            </button>
            <button 
                className={`${styles.controlButton} ${!isAudioEnabled ? styles.disabled : ''}`}
                onClick={handleAudioToggle}
                title={isAudioEnabled ? "Mute" : "Unmute"}
            >
                {isAudioEnabled ? "🎤" : "🔇"}
            </button>
            <button 
                className={`${styles.controlButton} ${isScreenSharing ? styles.active : ''}`}
                onClick={handleScreenShareToggle}
                title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
            >
                {isScreenSharing ? "🖥️" : "💻"}
            </button>
            <button 
                className={`${styles.controlButton} ${styles.endCall}`}
                onClick={onEndCall}
                title="End Call"
            >
                ❌
            </button>
        </div>
    );
} 