import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import '../App.css';

function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [tab, setTab] = useState('requests');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [reqRes, schRes] = await Promise.all([
        axios.get('/api/requests'),
        axios.get('/api/schedules')
      ]);
      setRequests(reqRes.data);
      setSchedules(schRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const updateRequestStatus = async (id, newStatus) => {
    try {
      await axios.patch(`/api/requests/${id}`, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error('Failed to update request:', err);
    }
  };

  const openCount = requests.filter(r => r.status === 'open').length;
  const inProgressCount = requests.filter(r => r.status === 'in-progress').length;
  const overdueCount = schedules.filter(s => new Date(s.next_due_date) < new Date()).length;

  return (
    <div>
      <div className="header">
        <div>
          <h1>Stoneymountain CMMS</h1>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Maintenance & Asset Management</p>
        </div>
        <div className="header-right">
          <div className="user-info">
            <p>Welcome, <strong>{user.name}</strong></p>
          </div>
          <button className="secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="container">
        <div style={{ marginBottom: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link to="/request/new" style={{ textDecoration: 'none' }}>
            <button className="secondary">+ New Request</button>
          </Link>
          <Link to="/assets" style={{ textDecoration: 'none' }}>
            <button className="secondary">Manage Assets</button>
          </Link>
          <Link to="/pm-schedules" style={{ textDecoration: 'none' }}>
            <button className="secondary">PM Schedules</button>
          </Link>
        </div>

        <div className="grid" style={{ marginBottom: '30px' }}>
          <div className="card">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc3545' }}>{openCount}</div>
              <div style={{ color: '#666', marginTop: '5px' }}>Open Requests</div>
            </div>
          </div>
          <div className="card">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>{inProgressCount}</div>
              <div style={{ color: '#666', marginTop: '5px' }}>In Progress</div>
            </div>
          </div>
          <div className="card">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>{overdueCount}</div>
              <div style={{ color: '#666', marginTop: '5px' }}>Overdue PM Tasks</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '0' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
            <button
              onClick={() => setTab('requests')}
              style={{
                flex: 1,
                padding: '15px',
                border: 'none',
                background: tab === 'requests' ? '#007bff' : 'white',
                color: tab === 'requests' ? 'white' : '#333',
                cursor: 'pointer',
                borderRadius: '0'
              }}
            >
              Maintenance Requests
            </button>
            <button
              onClick={() => setTab('schedules')}
              style={{
                flex: 1,
                padding: '15px',
                border: 'none',
                background: tab === 'schedules' ? '#007bff' : 'white',
                color: tab === 'schedules' ? 'white' : '#333',
                cursor: 'pointer',
                borderRadius: '0'
              }}
            >
              PM Schedules
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {loading ? (
              <p>Loading...</p>
            ) : tab === 'requests' ? (
              <div>

                {requests.length === 0 ? (
                  <p style={{ color: '#666' }}>No maintenance requests yet.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Asset</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map(req => (
                        <tr key={req.id}>
                          <td>{req.title}</td>
                          <td>{req.asset_id || 'General'}</td>
                          <td>
                            <span className={`status-badge priority-${req.priority}`}>
                              {req.priority}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge status-${req.status}`}>
                              {req.status}
                            </span>
                          </td>
                          <td>{format(new Date(req.created_at), 'MMM d')}</td>
                          <td>
                            <div className="action-buttons">
                              {req.status === 'open' && (
                                <button
                                  className="secondary"
                                  onClick={() => updateRequestStatus(req.id, 'in-progress')}
                                >
                                  Start
                                </button>
                              )}
                              {req.status === 'in-progress' && (
                                <button
                                  className="success"
                                  onClick={() => updateRequestStatus(req.id, 'completed')}
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div>
                {schedules.length === 0 ? (
                  <p style={{ color: '#666' }}>No PM schedules yet.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Asset</th>
                        <th>Frequency</th>
                        <th>Last Done</th>
                        <th>Next Due</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map(sched => {
                        const nextDue = new Date(sched.next_due_date);
                        const isOverdue = nextDue < new Date();
                        return (
                          <tr key={sched.id} style={{ background: isOverdue ? '#fff5f5' : 'transparent' }}>
                            <td>{sched.task_name}</td>
                            <td>{sched.asset_id || 'General'}</td>
                            <td>{sched.frequency_days} days</td>
                            <td>{sched.last_completed_date ? format(new Date(sched.last_completed_date), 'MMM d, yyyy') : 'Never'}</td>
                            <td>{format(nextDue, 'MMM d, yyyy')}</td>
                            <td>
                              <span className={`status-badge ${isOverdue ? 'priority-high' : 'status-open'}`}>
                                {isOverdue ? 'Overdue' : 'Scheduled'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
