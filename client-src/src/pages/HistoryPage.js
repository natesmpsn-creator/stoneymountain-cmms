import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import '../App.css';

function HistoryPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [tab, setTab] = useState('requests');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reqRes, schRes] = await Promise.all([
        axios.get('/api/history/requests'),
        axios.get('/api/history/schedules')
      ]);
      setRequests(reqRes.data);
      setSchedules(schRes.data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <h1>Work History</h1>
        <button className="secondary" onClick={() => navigate('/dashboard')}>Back</button>
      </div>

      <div className="container">
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
              Completed Work Orders
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
              PM Completion History
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {loading ? (
              <p>Loading...</p>
            ) : tab === 'requests' ? (
              <div>
                {requests.length === 0 ? (
                  <p style={{ color: '#666' }}>No completed work orders yet.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Asset</th>
                        <th>Priority</th>
                        <th>Created</th>
                        <th>Completed</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map(req => (
                        <tr key={req.id}>
                          <td><strong>{req.title}</strong></td>
                          <td>{req.asset_id || 'General'}</td>
                          <td>
                            <span className={`status-badge priority-${req.priority}`}>
                              {req.priority}
                            </span>
                          </td>
                          <td>{format(new Date(req.created_at), 'MMM d, yyyy')}</td>
                          <td>{format(new Date(req.updated_at), 'MMM d, yyyy')}</td>
                          <td style={{ fontSize: '12px', color: '#666' }}>{req.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div>
                {schedules.length === 0 ? (
                  <p style={{ color: '#666' }}>No PM completion history yet.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Asset</th>
                        <th>Frequency</th>
                        <th>Last Completed</th>
                        <th>Completed By</th>
                        <th>Next Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map(sched => (
                        <tr key={sched.id}>
                          <td><strong>{sched.task_name}</strong></td>
                          <td>{sched.asset_id || 'General'}</td>
                          <td>{sched.frequency_days} days</td>
                          <td>{sched.last_completed_date ? format(new Date(sched.last_completed_date), 'MMM d, yyyy') : 'Never'}</td>
                          <td>{sched.completed_by_name || '—'}</td>
                          <td>{format(new Date(sched.next_due_date), 'MMM d, yyyy')}</td>
                        </tr>
                      ))}
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

export default HistoryPage;
