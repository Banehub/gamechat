import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from "../styles/sidemenu.module.css";
import { getOnlineUsers, logout } from '../services/api';
import Popup from './Popup';

export default function SideMenu({ onSelectUser }) {
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [error, setError] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupType, setPopupType] = useState('');
    const [currentUser] = useState(() => {
        // Initialize current user from localStorage only once
        const user = JSON.parse(localStorage.getItem('user'));
        return user;
    });
    const navigate = useNavigate();

    const fetchOnlineUsers = async () => {
        try {
            const users = await getOnlineUsers();
            // Filter out the current user from the online users list
            const filteredUsers = users.filter(user => user._id !== currentUser?.id);
            setOnlineUsers(filteredUsers);
            setError('');
        } catch (err) {
            setError('Failed to fetch online users');
            console.error('Error fetching online users:', err);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchOnlineUsers();
        
        // Refresh online users every 30 seconds
        const interval = setInterval(fetchOnlineUsers, 30000);
        
        // Cleanup interval on unmount
        return () => clearInterval(interval);
    }, []); // Empty dependency array since we don't need to re-run this effect

    const handleLogout = async () => {
        try {
            await logout();
            setPopupMessage('Logout successful!');
            setPopupType('success');
            setShowPopup(true);
            // Wait for popup to show before navigating
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } catch (err) {
            console.error('Error during logout:', err);
            setPopupMessage('Error during logout');
            setPopupType('error');
            setShowPopup(true);
        }
    };

    const handleUserClick = (user) => {
        onSelectUser(user);
    };

    return (
        <div className={styles.sideMenu}>
            {showPopup && (
                <Popup
                    message={popupMessage}
                    type={popupType}
                    onClose={() => setShowPopup(false)}
                />
            )}
            <div className={styles.userList}>
                <h2 className={styles.title}>Online Users</h2>
                {error && <p className={styles.error}>{error}</p>}
                {onlineUsers.length === 0 ? (
                    <p className={styles.noUsers}>No other users online</p>
                ) : (
                    onlineUsers.map((user) => (
                        <div 
                            key={user._id} 
                            className={styles.userItem}
                            onClick={() => handleUserClick(user)}
                        >
                            <span className={`${styles.status} ${styles[user.status]}`}></span>
                            <span className={styles.userName}>{user.username}</span>
                        </div>
                    ))
                )}
            </div>
            
            {currentUser && (
                <div className={styles.currentUser}>
                    <div className={styles.userInfo}>
                        <span className={`${styles.status} ${styles[currentUser.status || 'online']}`}></span>
                        <span className={styles.userName}>{currentUser.username}</span>
                    </div>
                    <button onClick={handleLogout} className={styles.logoutButton}>
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}
