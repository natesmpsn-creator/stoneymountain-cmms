import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import '../App.css';

function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [tab, setTab] = useState('requests');
  const [loading, setLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completingScheduleId, setCompletingScheduleId] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [completionData, setCompletionData] = useState({});

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

  const openCompletionModal = async (scheduleId) => {
    try {
      const res = await axios.get(`/api/schedules/${scheduleId}/checklist`);
      setChecklistItems(res.data);
      setCompletingScheduleId(scheduleId);
      setCompletionData(
        res.data.reduce((acc, item) => {
          acc[item.id] = { status: 'good', comment: '' };
          return acc;
        }, {})
      );
      setShowCompletionModal(true);
    } catch (err) {
      console.error('Failed to load checklist:', err);
    }
  };

  const closeCompletionModal = () => {
    setShowCompletionModal(false);
    setCompletingScheduleId(null);
    setChecklistItems([]);
    setCompletionData({});
  };

  const handleCompleteSchedule = async () => {
    try {
      const items = checklistItems.map(item => ({
        job_plan_item_id: item.id,
        status: completionData[item.id]?.status || 'good',
        comment: completionData[item.id]?.comment || ''
      }));

      const nextDue = format(addDays(new Date(), 30), 'yyyy-MM-dd');

      await axios.post(`/api/schedules/${completingScheduleId}/complete`, {
        last_completed_date: format(new Date(), 'yyyy-MM-dd'),
        next_due_date: nextDue,
        items
      });

      fetchData();
      closeCompletionModal();
    } catch (err) {
      console.error('Failed to complete schedule:', err);
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
          <Link to="/history" style={{ textDecoration: 'none' }}>
            <button className="secondary">History</button>
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
                        <th>Action</th>
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
                            <td>
                              {isOverdue && (
                                <button
                                  className="success"
                                  onClick={() => openCompletionModal(sched.id)}
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                  Complete
                                </button>
                              )}
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

      {showCompletionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '20px' }}>Complete PM Task</h2>

            {checklistItems.length > 0 ? (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
                  Review each item and mark as Good or Bad. Add comments if needed.
                </p>
                {checklistItems.map(item => (
                  <div key={item.id} style={{
                    border: '1px solid #ddd',
                    padding: '15px',
                    borderRadius: '4px',
                    marginBottom: '10px'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>{item.item_name}</div>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="radio"
                          name={`status-${item.id}`}
                          value="good"
                          checked={(completionData[item.id]?.status || 'good') === 'good'}
                          onChange={(e) => setCompletionData({
                            ...completionData,
                            [item.id]: { ...completionData[item.id], status: 'good' }
                          })}
                        />
                        <span style={{ color: '#28a745' }}>Good</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="radio"
                          name={`status-${item.id}`}
                          value="bad"
                          checked={(completionData[item.id]?.status || 'good') === 'bad'}
                          onChange={(e) => setCompletionData({
                            ...completionData,
                            [item.id]: { ...completionData[item.id], status: 'bad' }
                          })}
                        />
                        <span style={{ color: '#dc3545' }}>Bad</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="Add comment (optional)"
                      value={completionData[item.id]?.comment || ''}
                      onChange={(e) => setCompletionData({
                        ...completionData,
                        [item.id]: { ...completionData[item.id], comment: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '12px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', marginBottom: '20px' }}>No checklist items for this PM task.</p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="success"
                onClick={handleCompleteSchedule}
                style={{ flex: 1 }}
              >
                Mark Complete
              </button>
              <button
                className="secondary"
                onClick={closeCompletionModal}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
