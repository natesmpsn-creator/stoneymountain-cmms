import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';

function SettingsPage({ user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [addUserMessage, setAddUserMessage] = useState('');
  const [addUserMessageType, setAddUserMessageType] = useState('');

  useEffect(() => {
    if (user && user.is_admin) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('All fields are required');
      setMessageType('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match');
      setMessageType('error');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('New password must be at least 6 characters');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/change-password', {
        currentPassword,
        newPassword
      });

      setMessage(response.data.message);
      setMessageType('success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to change password');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddUserMessage('');

    if (!newUserEmail || !newUserName || !newUserPassword) {
      setAddUserMessage('All fields are required');
      setAddUserMessageType('error');
      return;
    }

    if (newUserPassword.length < 6) {
      setAddUserMessage('Password must be at least 6 characters');
      setAddUserMessageType('error');
      return;
    }

    try {
      await axios.post('/api/users', {
        email: newUserEmail,
        name: newUserName,
        password: newUserPassword
      });

      setAddUserMessage('User created successfully');
      setAddUserMessageType('success');
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setShowAddUser(false);
      fetchUsers();
    } catch (err) {
      setAddUserMessage(err.response?.data?.error || 'Failed to create user');
      setAddUserMessageType('error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`/api/users/${userId}`);
      setAddUserMessage('User deleted successfully');
      setAddUserMessageType('success');
      fetchUsers();
    } catch (err) {
      setAddUserMessage(err.response?.data?.error || 'Failed to delete user');
      setAddUserMessageType('error');
    }
  };

  return (
    <div>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/logo.png" alt="Stoney Mountain Baptist Church" style={{ height: '60px' }} />
          <div>
            <h1 style={{ margin: '0' }}>Maintenance Manager</h1>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>Stoney Mountain Baptist Church</p>
          </div>
        </div>
      </div>

      <div className="container">
        <div style={{ maxWidth: '500px', margin: '30px auto' }}>
          <h2>Settings</h2>

          <div className="card">
            <h3>Change Password</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label htmlFor="current">Current Password</label>
                <input
                  type="password"
                  id="current"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="new">New Password</label>
                <input
                  type="password"
                  id="new"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm">Confirm New Password</label>
                <input
                  type="password"
                  id="confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading}
                />
              </div>

              {message && (
                <div style={{
                  padding: '10px',
                  marginBottom: '15px',
                  borderRadius: '4px',
                  color: messageType === 'success' ? '#155724' : '#721c24',
                  background: messageType === 'success' ? '#d4edda' : '#f8d7da'
                }}>
                  {message}
                </div>
              )}

              <button type="submit" className="primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {user && user.is_admin && (
            <div className="card" style={{ marginTop: '30px' }}>
              <h3>User Management</h3>
              <button
                className="secondary"
                onClick={() => setShowAddUser(!showAddUser)}
                style={{ marginBottom: '15px' }}
              >
                {showAddUser ? '✕ Cancel' : '+ Add User'}
              </button>

              {showAddUser && (
                <form onSubmit={handleAddUser} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #ddd' }}>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      id="name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Full name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                      type="password"
                      id="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                    />
                  </div>

                  {addUserMessage && (
                    <div style={{
                      padding: '10px',
                      marginBottom: '15px',
                      borderRadius: '4px',
                      color: addUserMessageType === 'success' ? '#155724' : '#721c24',
                      background: addUserMessageType === 'success' ? '#d4edda' : '#f8d7da'
                    }}>
                      {addUserMessage}
                    </div>
                  )}

                  <button type="submit" className="primary">Create User</button>
                </form>
              )}

              <div>
                <h4 style={{ marginBottom: '15px' }}>Users ({users.length})</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.is_admin ? 'Admin' : 'User'}</td>
                        <td>
                          {u.id !== user.id && (
                            <button
                              className="secondary"
                              onClick={() => handleDeleteUser(u.id)}
                              style={{ padding: '4px 8px', fontSize: '11px', background: '#dc3545', color: 'white' }}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
