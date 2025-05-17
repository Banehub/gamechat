<<<<<<< HEAD
<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from "../styles/sideMenu.module.css";
import { getOnlineUsers, logout } from '../services/api';
=======
import styles from "../styles/sidemenu.module.css";
>>>>>>> c74dc5aafb1578e74ac5d7528712b380d8eea3f2
=======
import styles from "../styles/sidemenu.module.css";
>>>>>>> c74dc5aafb1578e74ac5d7528712b380d8eea3f2

export default function SideMenu() {
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();

    const fetchOnlineUsers = async () => {
        try {
            const users = await getOnlineUsers();
            setOnlineUsers(users);
            setError('');
        } catch (err) {
            setError('Failed to fetch online users');
            console.error('Error fetching online users:', err);
        }
    };

    useEffect(() => {
        // Get current user from localStorage
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
        
        fetchOnlineUsers();
        // Refresh online users every 30 seconds
        const interval = setInterval(fetchOnlineUsers, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (err) {
            console.error('Error during logout:', err);
        }
    };

    return (
        <div className={styles.sideMenu}>
            <div className={styles.userList}>
                <h2 className={styles.title}>Online Users</h2>
                {error && <p className={styles.error}>{error}</p>}
                {onlineUsers.length === 0 ? (
                    <p className={styles.noUsers}>No users online</p>
                ) : (
                    onlineUsers.map((user) => (
                        <div key={user._id} className={styles.userItem}>
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
