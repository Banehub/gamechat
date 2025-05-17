import styles from '../styles/videoCallModal.module.css';
import CallControls from './CallControls';

export default function VideoCallModal({ 
    localStream, 
    remoteStream, 
    onEndCall, 
    onToggleVideo, 
    onToggleAudio, 
    onToggleScreenShare 
}) {
    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.videoGrid}>
                    <div className={styles.remoteVideoContainer}>
                        <video
                            autoPlay
                            playsInline
                            className={styles.remoteVideo}
                            ref={video => {
                                if (video) video.srcObject = remoteStream;
                            }}
                        />
                        {!remoteStream && (
                            <div className={styles.waitingMessage}>
                                Waiting for other user to join...
                            </div>
                        )}
                    </div>
                    <div className={styles.localVideoContainer}>
                        <video
                            autoPlay
                            playsInline
                            muted
                            className={styles.localVideo}
                            ref={video => {
                                if (video) video.srcObject = localStream;
                            }}
                        />
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