import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './UserDashboard.css'; // 👈 Make sure to import the CSS file

function UserDashboard() {
    const [readings, setReadings] = useState([]);
    const [error, setError] = useState('');
    const backendApiUrl = 'http://localhost:4000/api';
    const token = localStorage.getItem('jwtToken');
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const fetchDashboardReadings = async () => {
            setError('');
            try {
                const response = await axios.get(`${backendApiUrl}/dashboard/readings`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setReadings(response.data);
            } catch (error) {
                setError(error.response?.data?.message || 'Failed to fetch readings.');
            }
        };

        fetchDashboardReadings();
    }, [token]);

    const getReadingsByIP = (ip) => {
        return readings.filter(reading => reading.device_ip === ip);
    };

    const calculateBilling = (readings) => {
        if (!readings || readings.length === 0) return { totalConsumption: 0, totalBill: 0 };
    
        // Total consumption is the sum of the `value` field from ESP (already raw - pre)
        const totalConsumption = readings.reduce((sum, r) => sum + r.value, 0);
    
        // Ethiopian electricity tier rates
        const tiers = [
            { limit: 50, rate: 0.27 },
            { limit: 100, rate: 0.77 },
            { limit: 200, rate: 1.63 },
            { limit: 300, rate: 2.00 },
            { limit: 400, rate: 2.20 },
            { limit: 500, rate: 2.41 },
            { limit: Infinity, rate: 2.48 },
        ];
    
        let remaining = totalConsumption;
        let totalBill = 0;
    
        for (const tier of tiers) {
            const units = Math.min(tier.limit, remaining);
            totalBill += units * tier.rate;
            remaining -= units;
            if (remaining <= 0) break;
        }
    
        return { totalConsumption, totalBill };
    };
    
    return (
        <div className="dashboard-container">
            <h2 className="dashboard-title">User Dashboard</h2>
            <p className="dashboard-welcome">Welcome, {user?.username}!</p>

            {error && <p className="dashboard-error">{error}</p>}

            {user?.assignedDevices?.length > 0 ? (
                user.assignedDevices.map(ip => {
                    const readingsForIP = getReadingsByIP(ip);
                    const billingDataForIP = calculateBilling(readingsForIP);

                    return (
                        <div className="device-card" key={ip}>
                            <h3>Meter IP: {ip}</h3>
                            {readingsForIP.length > 0 ? (
                                <table className="reading-table">
                                    <thead>
                                        <tr>
                                            <th>Value</th>
                                            <th>Timestamp (EAT)</th>
                                            <th>Device IP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {readingsForIP.map(reading => (
                                            <tr key={reading._id}>
                                                <td>{reading.value}</td>
                                                <td>{new Date(reading.timestamp).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</td>
                                                <td>{reading.device_ip}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p>No readings available for this meter.</p>
                            )}
                            <div className="billing-box">
                                <h4>Billing Summary</h4>
                                <p>Total Consumption: {billingDataForIP.totalConsumption.toFixed(2)} units</p>
                                <p>Total Bill: ETB {billingDataForIP.totalBill.toFixed(2)}</p>
                            </div>
                        </div>
                    );
                })
            ) : (
                <p className="dashboard-info">No meter IPs are associated with your account.</p>
            )}

            <p className="dashboard-register-link">
                Need to register another account? <Link to="/register">Go to Registration</Link>
            </p>
        </div>
    );
}

export default UserDashboard;
