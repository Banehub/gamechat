import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from "../styles/modal.module.css";
import { register } from '../services/api';
import Popup from './Popup';

export default function RegisterModal() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
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

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setPopupMessage('Passwords do not match');
            setPopupType('error');
            setShowPopup(true);
            return;
        }

        try {
            await register(formData.username, formData.email, formData.password);
            setPopupMessage('Registration successful! Please login.');
            setPopupType('success');
            setShowPopup(true);
            // Wait for popup to show before navigating
            setTimeout(() => {
                navigate('/');
            }, 1000);
        } catch (err) {
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
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
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
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                    <button type="submit">Register</button>
                    <p className={styles.modal_form_p}>Already have an account? <Link to="/">Login</Link></p>
                </form>
            </div>
        </div>
    );
}
