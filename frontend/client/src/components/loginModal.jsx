import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from "../styles/modal.module.css";
import { login } from '../services/api';
import Popup from './Popup';

export default function Modal() {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupType, setPopupType] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            console.log('Attempting login...');
            const response = await login(formData.username, formData.password);
            console.log('Login successful, response:', response);
            
            // Verify user data is in localStorage
            const user = JSON.parse(localStorage.getItem('user'));
            console.log('User data in localStorage:', user);
            
            if (user) {
                setPopupMessage('Login successful!');
                setPopupType('success');
                setShowPopup(true);
                console.log('Navigating to dashboard...');
                // Force a page reload to ensure the App component re-renders with new user state
                window.location.href = '/dashboard';
            } else {
                throw new Error('User data not properly stored');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message);
            setPopupMessage(err.message);
            setPopupType('error');
            setShowPopup(true);
        }
    };

    return (
        <div className={styles.modal}>
            {showPopup && (
                <Popup
                    message={popupMessage}
                    type={popupType}
                    onClose={() => setShowPopup(false)}
                />
            )}
            <div className={styles.modal_content}>
                {error && <p className={styles.error}>{error}</p>}
                <form className={styles.modal_form} onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    <button type="submit">Login</button>
                    <p className={styles.modal_form_p}>Don't have an account? <Link to="/register">Sign up</Link></p>
                </form>
            </div>
        </div>
    );
}
