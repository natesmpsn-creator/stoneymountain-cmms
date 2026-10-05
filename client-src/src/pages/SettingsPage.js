import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

function SettingsPage({ user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

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
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
