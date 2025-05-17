import { useEffect } from 'react';
import styles from '../styles/popup.module.css';

export default function Popup({ message, type, onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`${styles.popup} ${styles[type]}`}>
            <p>{message}</p>
        </div>
    );
} 