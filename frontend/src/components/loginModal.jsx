import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from "../styles/modal.module.css";
import { login } from '../services/api';

export default function Modal() {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
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
            await login(formData.username, formData.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className={styles.modal}>
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
