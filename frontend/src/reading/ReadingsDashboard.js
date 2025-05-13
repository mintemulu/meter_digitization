import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ReadingsDashboard() {
    const [readings, setReadings] = useState([]);
    const [user, setUser] = useState(null);
    const backendApiUrl = 'http://localhost:4000/api';

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));

        const fetchReadings = async () => {
            if (token) {
                try {
                    const response = await axios.get(`${backendApiUrl}/readings`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    setReadings(response.data);
                } catch (error) {
                    console.error('Error fetching readings:', error);
                    // Handle unauthorized errors (e.g., redirect to login)
                }
            }
        };

        fetchReadings();
    }, [backendApiUrl]);

    const formatDate = (timestamp) => { /* ... */ };
    const calculateSimpleBill = (readingsForUser) => { /* ... */ };

    if (!user) {
        return <p>Please log in.</p>; // Or your login component
    }

    return (
        <div>
            <h2>Meter Readings</h2>
            {user.role === 'user' && (
                <div>
                    <h3>Your Consumption</h3>
                    {readings.map(reading => (
                        <div key={reading._id}>
                            <p>Value: {reading.value}</p>
                            <p>Last Updated: {formatDate(reading.timestamp)}</p>
                            {/* <p>Estimated Bill: {calculateSimpleBill([reading])} ETB</p> */}
                        </div>
                    ))}
                </div>
            )}

            {user.role === 'admin' && (
                <div>
                    <h3>All Readings</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Value</th>
                                <th>Raw</th>
                                <th>Pre</th>
                                <th>Error</th>
                                <th>Rate</th>
                                <th>Timestamp (EAT)</th>
                                <th>Device IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {readings.map(reading => (
                                <tr key={reading._id}>
                                    <td>{reading.value}</td>
                                    <td>{reading.raw}</td>
                                    <td>{reading.pre}</td>
                                    <td>{reading.error}</td>
                                    <td>{reading.rate}</td>
                                    <td>{formatDate(reading.timestamp)}</td>
                                    <td>{reading.device_ip}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default ReadingsDashboard;