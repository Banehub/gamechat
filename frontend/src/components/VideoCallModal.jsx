import React, { useRef, useEffect } from 'react';
import styles from '../styles/videoCallModal.module.css';
import CallControls from './CallControls';

function Video({ stream, muted, className }) {
    const videoRef = useRef(null);
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);
    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className={className}
        />
    );
}

export default function VideoCallModal({ 
    localStream, 
    remoteStreams,
    onEndCall, 
    onToggleVideo, 
    onToggleAudio, 
    onToggleScreenShare 
}) {
    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.videoGrid}>
                    {remoteStreams && remoteStreams.length > 0 ? (
                        remoteStreams.map((stream, idx) => (
                            <div className={styles.remoteVideoContainer} key={idx}>
                                <Video stream={stream} className={styles.remoteVideo} />
                            </div>
                        ))
                    ) : (
                        <div className={styles.waitingMessage}>
                            Waiting for other user to join...
                        </div>
                    )}
                    <div className={styles.localVideoContainer}>
                        <Video stream={localStream} muted className={styles.localVideo} />
                    </div>
                </div>
                <CallControls
                    onEndCall={onEndCall}
                    onToggleVideo={onToggleVideo}
                    onToggleAudio={onToggleAudio}
                    onToggleScreenShare={onToggleScreenShare}
                />
            </div>
        </div>
    );
} 