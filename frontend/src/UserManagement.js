import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserManagement.css';

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const backendApiUrl = 'http://localhost:4000/api';
    const token = localStorage.getItem('jwtToken');

    // Form state for editing user
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        role: 'user'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${backendApiUrl}/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch users. ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredUsers = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startEdit = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            role: user.role
        });
    };

    const cancelEdit = () => {
        setEditingUser(null);
        setFormData({
            username: '',
            email: '',
            role: 'user'
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const updateUser = async (e) => {
        e.preventDefault();
        
        if (!formData.username || !formData.email) {
            setError('Username and email are required');
            return;
        }

        setIsLoading(true);
        try {
            await axios.put(`${backendApiUrl}/users/${editingUser._id}`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            // Update the user in the local state
            setUsers(users.map(user => 
                user._id === editingUser._id ? { ...user, ...formData } : user
            ));
            
            setSuccess('User updated successfully');
            setEditingUser(null);
        } catch (err) {
            setError('Failed to update user. ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDelete = (user) => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const deleteUser = async () => {
        if (!userToDelete) return;
        
        setIsLoading(true);
        try {
            await axios.delete(`${backendApiUrl}/users/${userToDelete._id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            // Remove the user from the local state
            setUsers(users.filter(user => user._id !== userToDelete._id));
            
            setSuccess('User deleted successfully');
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (err) {
            setError('Failed to delete user. ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="user-management">
            <div className="page-header">
                <h1>User Management</h1>
                <p>View, edit, and delete user accounts</p>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>User Accounts</h3>
                    <div className="header-actions">
                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </div>
                        <a href="/register" className="primary-button">Add New User</a>
                    </div>
                </div>
                <div className="card-body">
                    {error && <div className="alert error">{error}</div>}
                    {success && <div className="alert success">{success}</div>}

                    {isLoading && !editingUser ? (
                        <div className="loading-skeleton">
                            <div className="skeleton-row"></div>
                            <div className="skeleton-row"></div>
                            <div className="skeleton-row"></div>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map(user => (
                                            <tr key={user._id}>
                                                <td>{user.username}</td>
                                                <td>{user.email}</td>
                                                <td>
                                                    <span className={`role-badge ${user.role}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button 
                                                            className="action-button edit"
                                                            onClick={() => startEdit(user)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button 
                                                            className="action-button delete"
                                                            onClick={() => confirmDelete(user)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="empty-message">
                                                {searchTerm ? 'No users match your search' : 'No users found'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Edit User</h3>
                            <button className="close-button" onClick={cancelEdit}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={updateUser}>
                                <div className="form-group">
                                    <label htmlFor="username">Username</label>
                                    <input
                                        type="text"
                                        id="username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="email">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="role">Role</label>
                                    <select
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="secondary-button" onClick={cancelEdit}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="primary-button" disabled={isLoading}>
                                        {isLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Confirm Delete</h3>
                            <button className="close-button" onClick={() => setShowDeleteModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete the user <strong>{userToDelete?.username}</strong>?</p>
                            <p className="warning-text">This action cannot be undone.</p>
                            <div className="modal-actions">
                                <button 
                                    className="secondary-button" 
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="delete-button" 
                                    onClick={deleteUser}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Deleting...' : 'Delete User'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagement;