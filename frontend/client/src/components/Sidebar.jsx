import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/sidebar.module.css';
import GroupCall from './GroupCall';

export default function Sidebar({ onSelectUser, selectedUser }) {
  const [users, setUsers] = useState([]);
  const [showGroupCall, setShowGroupCall] = useState(false);
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setUsers(data.filter(user => user._id !== currentUser.id));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleGroupCallClick = () => {
    setShowGroupCall(true);
  };

  const handleBackToChat = () => {
    setShowGroupCall(false);
  };

  if (showGroupCall) {
    return (
      <div className={styles.sidebar}>
        <div className={styles.header}>
          <button onClick={handleBackToChat} className={styles.backButton}>
            ← Back to Chat
          </button>
        </div>
        <GroupCall />
      </div>
    );
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h2>Chat</h2>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </div>
      
      <div className={styles.groupCallSection}>
        <div className={styles.groupCallHeader}>
          <span className={styles.groupIcon}>👥</span>
          <h3>Group Calls</h3>
        </div>
        <button onClick={handleGroupCallClick} className={styles.groupCallButton}>
          <span className={styles.groupIcon}>🎥</span>
          Join Test Group
        </button>
      </div>

      <div className={styles.userList}>
        <div className={styles.userListHeader}>
          <h3>Online Users</h3>
        </div>
        {users.map((user) => (
          <div
            key={user._id}
            className={`${styles.userItem} ${
              selectedUser?._id === user._id ? styles.selected : ''
            }`}
            onClick={() => onSelectUser(user)}
          >
            <div className={styles.userAvatar}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.username}>{user.username}</div>
              <div className={styles.status}>
                {user.online ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 