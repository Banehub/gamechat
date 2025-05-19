import styles from '../styles/incomingCallModal.module.css';

export default function IncomingCallModal({ caller, onAccept, onDecline }) {
    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.callInfo}>
                    <div className={styles.avatar}>
                        {caller.username.charAt(0).toUpperCase()}
                    </div>
                    <h2>Incoming Call</h2>
                    <p>{caller.username} is calling you...</p>
                </div>
                <div className={styles.controls}>
                    <button 
                        className={`${styles.button} ${styles.acceptButton}`}
                        onClick={onAccept}
                    >
                        Accept
                    </button>
                    <button 
                        className={`${styles.button} ${styles.declineButton}`}
                        onClick={onDecline}
                    >
                        Decline
                    </button>
                </div>
            </div>
        </div>
    );
} 