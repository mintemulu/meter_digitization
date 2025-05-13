import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './AdminDashboard.css';

function AdminDashboard() {
    const [ipAddress, setIpAddress] = useState('');
    const [monthlyReadings, setMonthlyReadings] = useState([]); // Initialize as empty array
    const [billingData, setBillingData] = useState({ totalConsumption: 0, totalBill: 0 });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('devices');

    const backendApiUrl = 'http://localhost:4000/api';
    const token = localStorage.getItem('jwtToken');

    const handleViewData = async () => {
        setError('');
        setMonthlyReadings([]);
        setBillingData({ totalConsumption: 0, totalBill: 0 });

        if (!ipAddress) {
            setError('Please enter the Device IP address.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.get(`${backendApiUrl}/dashboard/monthly/${ipAddress}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            // Add null checks for API response
            if (response.data && response.data.monthlyReadings) {
                setMonthlyReadings(response.data.monthlyReadings);
            } else {
                setMonthlyReadings([]);
            }
            
            if (response.data && response.data.billingData) {
                setBillingData(response.data.billingData);
            } else {
                setBillingData({ totalConsumption: 0, totalBill: 0 });
            }
            
            setIsLoading(false);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to fetch dashboard data.');
            setIsLoading(false);
        }
    };

    const exportToCSV = () => {
        if (!monthlyReadings || monthlyReadings.length === 0) return;
        
        const csvContent = [
            ["Value", "Timestamp"],
            ...monthlyReadings.map(reading => [
                reading.value, 
                new Date(reading.timestamp).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
            ])
        ].map(row => row.join(",")).join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `device-${ipAddress}-readings.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1>Admin Dashboard</h1>
                <p>Manage your energy monitoring system</p>
            </div>

            <div className="dashboard-tabs">
                <button 
                    className={activeTab === 'devices' ? 'active' : ''} 
                    onClick={() => setActiveTab('devices')}
                >
                    Device Data
                </button>
                <button 
                    className={activeTab === 'users' ? 'active' : ''} 
                    onClick={() => setActiveTab('users')}
                >
                    User Management
                </button>
            </div>

            {activeTab === 'devices' && (
                <div className="dashboard-content">
                    <div className="card">
                        <div className="card-header">
                            <h3>Device Readings</h3>
                            <p>View and analyze device consumption data</p>
                        </div>
                        <div className="card-body">
                            <div className="search-container">
                                <input
                                    type="text"
                                    placeholder="Enter device IP address..."
                                    value={ipAddress}
                                    onChange={(e) => setIpAddress(e.target.value)}
                                />
                                <button 
                                    className="primary-button" 
                                    onClick={handleViewData}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Loading...' : 'View Data'}
                                </button>
                            </div>

                            {error && <div className="alert error">{error}</div>}

                            {isLoading && (
                                <div className="loading-skeleton">
                                    <div className="skeleton-row"></div>
                                    <div className="skeleton-row"></div>
                                    <div className="skeleton-row"></div>
                                </div>
                            )}

                            {monthlyReadings && monthlyReadings.length > 0 && !isLoading && (
                                <>
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Value</th>
                                                    <th>Timestamp (EAT)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {monthlyReadings.map((reading) => (
                                                    <tr key={reading._id || Math.random()}>
                                                        <td>{reading.value}</td>
                                                        <td>{new Date(reading.timestamp).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="billing-summary">
                                        <div className="billing-card">
                                            <h4>Total Consumption</h4>
                                            <p>{billingData?.totalConsumption?.toFixed(2) || "0.00"} units</p>
                                        </div>
                                        <div className="billing-card">
                                            <h4>Total Bill</h4>
                                            <p>${billingData?.totalBill?.toFixed(2) || "0.00"}</p>
                                        </div>
                                    </div>

                                    <div className="card-actions">
                                        <button className="secondary-button" onClick={exportToCSV}>
                                            Export to CSV
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="dashboard-content">
                    <div className="card">
                        <div className="card-header">
                            <h3>User Management</h3>
                            <p>Manage system users and access control</p>
                        </div>
                        <div className="card-body">
                            <div className="user-management-options">
                                <div className="option-card">
                                    <div className="option-icon">👤</div>
                                    <div className="option-content">
                                        <h4>Register New User</h4>
                                        <p>Add a new user to the system with specific role and permissions</p>
                                        <Link to="/register" className="primary-button">Go to Registration</Link>
                                    </div>
                                </div>
                                
                                <div className="option-card">
                                    <div className="option-icon">🔑</div>
                                    <div className="option-content">
                                        <h4>Manage Existing Users</h4>
                                        <p>View, edit, or delete existing user accounts</p>
                                        <Link to="/users" className="secondary-button">View Users</Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;