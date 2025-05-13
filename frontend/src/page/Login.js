import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css'; // Import CSS file for styling (ensure this exists)

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const backendApiUrl = 'http://localhost:4000/api'; //  Move to a config file if needed

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); // Clear any previous errors

        if (!username.trim() || !password.trim()) {
            setError('Username and password are required.');
            return; // Stop the process if fields are empty
        }

        try {
            const response = await axios.post(`${backendApiUrl}/login`, { username, password });

            // Check for a successful response (status 2xx)
            if (response.status >= 200 && response.status < 300) {
                // Store token and user data in localStorage
                localStorage.setItem('jwtToken', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                // Debugging: Log the user object after successful login
                console.log('Login successful! User data:', response.data.user);

                // Redirect based on user role.  Use  /admin and /dashboard
                if (response.data.user.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            } else {
                // Handle non-2xx HTTP responses (e.g., 302, 404, 500)
                setError(`Login failed: Server responded with status ${response.status}`);
            }

        } catch (error) {
            // Handle network errors, server errors, and invalid credentials
            if (error.response) {
                // The server responded with an error status (e.g., 401, 500)
                setError(error.response.data?.message || 'Invalid credentials. Please check your username and password.');
            } else if (error.request) {
                // The request was made but no response was received
                setError('No response from the server. Please check your network connection.');
            } else {
                // Something happened in setting up the request that triggered an Error
                setError('An unexpected error occurred: ' + error.message);
            }
            console.error('Login error:', error); // Log the full error for debugging
        }
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleLogin}>
                <h2>Welcome Back</h2>
                {error && <p className="error-message">{error}</p>}

                <label htmlFor="username">Username</label>
                <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required //  HTML5 validation
                    placeholder="Enter your username"
                />

                <label htmlFor="password">Password</label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required  //  HTML5 validation
                    placeholder="Enter your password"
                />

                <button type="submit">Log In</button>
                <p className="register-link">
                    Don’t have an account? <Link to="/register">Register</Link>
                </p>
            </form>
        </div>
    );
}

export default Login;
