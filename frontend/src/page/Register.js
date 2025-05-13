import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css'; // 👈 import the CSS

function Register() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [meterIPsInput, setMeterIPsInput] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const backendApiUrl = 'http://localhost:4000/api';

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        const meterIP = meterIPsInput.trim();

        try {
            const response = await axios.post(`${backendApiUrl}/register`, {
                username,
                password,
                meterIPs: [meterIP],
            });

            setMessage(response.data.message);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            setError(error.response?.data?.message || 'Registration failed.');
        }
    };

    return (
        <div className="register-container">
            <form className="register-form" onSubmit={handleRegister}>
                <h2>Create Account</h2>
                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}
                
                <label>Username</label>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />

                <label>Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <label>Confirm Password</label>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />

                <label>Meter IP Address</label>
                <input
                    type="text"
                    value={meterIPsInput}
                    onChange={(e) => setMeterIPsInput(e.target.value)}
                    placeholder="e.g. 192.168.1.100"
                />
                <small>Enter a single meter IP address.</small>

                <button type="submit">Register</button>
                <p className="login-link">
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </form>
        </div>
    );
}

export default Register;
