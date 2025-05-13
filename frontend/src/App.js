import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './page/Login';
import Register from './page/Register';
import UserDashboard from './UserDashboard';
import AdminDashboard from './AdminDashboard';
import UserManagement from './UserManagement'; // Import the UserManagement component

function App() {
    const isAuthenticated = () => !!localStorage.getItem('jwtToken');
    const getUserRole = () => JSON.parse(localStorage.getItem('user'))?.role;

    const PrivateRoute = ({ element, ...rest }) => {
        return isAuthenticated() ? element : <Navigate to="/login" replace />;
    };

    const AdminRoute = ({ element, ...rest }) => {
        const role = getUserRole();
        return isAuthenticated() && role === 'admin' ? element : <Navigate to="/dashboard" replace />;
    };

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
                path="/dashboard"
                element={<PrivateRoute element={<UserDashboard />} />} // Make /dashboard the default user dashboard
            />
            <Route
                path="/admin"
                element={<AdminRoute element={<AdminDashboard />} />} // Direct route for admin
            />
            {/* Add the users route - only accessible to admins */}
            <Route
                path="/users"
                element={<AdminRoute element={<UserManagement />} />}
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

export default App;