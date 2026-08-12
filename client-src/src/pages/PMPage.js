import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import '../App.css';

function PMPage() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    asset_id: '',
    task_name: '',
    frequency_days: 30,
    last_completed_date: '',
    next_due_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedRes, assetRes] = await Promise.all([
        axios.get('/api/schedules'),
        axios.get('/api/assets')
      ]);
      setSchedules(schedRes.data);
      setAssets(assetRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFrequencyChange = (days) => {
    setFormData({
      ...formData,
      frequency_days: days,
      next_due_date: format(addDays(new Date(), days), 'yyyy-MM-dd')
    });
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.asset_id || !formData.task_name) {
      setError('Please select an asset and enter a task name');
      return;
    }

    try {
      await axios.post('/api/schedules', {
        asset_id: formData.asset_id || null,
        task_name: formData.task_name,
        frequency_days: parseInt(formData.frequency_days),
        last_completed_date: formData.last_completed_date || null,
        next_due_date: formData.next_due_date
      });

      setFormData({
        asset_id: '',
        task_name: '',
        frequency_days: 30,
        last_completed_date: '',
        next_due_date: ''
      });
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create schedule');
    }
  };

  const markComplete = async (id) => {
    try {
      const nextDue = format(addDays(new Date(), 30), 'yyyy-MM-dd');
      await axios.patch(`/api/schedules/${id}`, {
        last_completed_date: format(new Date(), 'yyyy-MM-dd'),
        next_due_date: nextDue
      });
      fetchData();
    } catch (err) {
      console.error('Failed to update schedule:', err);
    }
  };

  return (
    <div>
      <div className="header">
        <h1>Preventative Maintenance Schedules</h1>
        <button className="secondary" onClick={() => navigate('/dashboard')}>Back</button>
      </div>

      <div className="container">
        <div className="card">
          <h3 style={{ marginBottom: '15px' }}>Create PM Schedule</h3>
          {error && (
            <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {!showForm ? (
            <button className="success" onClick={() => setShowForm(true)}>+ New PM Schedule</button>
          ) : (
            <form onSubmit={handleAddSchedule} style={{ maxWidth: '600px' }}>
              <div className="form-group">
                <label>Equipment *</label>
                <select
                  value={formData.asset_id}
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                >
                  <option value="">-- Select Equipment (or General) --</option>
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Task Name *</label>
                <input
                  type="text"
                  value={formData.task_name}
                  onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                  required
                  placeholder="e.g., HVAC Filter Change, Boiler Inspection"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Frequency</label>
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                    {[7, 14, 30, 90, 365].map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => handleFrequencyChange(days)}
                        style={{
                          padding: '5px 10px',
                          background: formData.frequency_days === days ? '#007bff' : '#e9ecef',
                          color: formData.frequency_days === days ? 'white' : '#333',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={formData.frequency_days}
                    onChange={(e) => handleFrequencyChange(parseInt(e.target.value))}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Last Completed</label>
                  <input
                    type="date"
                    value={formData.last_completed_date}
                    onChange={(e) => setFormData({ ...formData, last_completed_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Next Due Date *</label>
                <input
                  type="date"
                  value={formData.next_due_date}
                  onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit">Create Schedule</button>
                <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Schedules ({schedules.length})</h3>
          {loading ? (
            <p>Loading...</p>
          ) : schedules.length === 0 ? (
            <p style={{ color: '#666' }}>No PM schedules yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Equipment</th>
                  <th>Frequency</th>
                  <th>Last Done</th>
                  <th>Next Due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(sched => {
                  const asset = assets.find(a => a.id === sched.asset_id);
                  const nextDue = new Date(sched.next_due_date);
                  const isOverdue = nextDue < new Date();

                  return (
                    <tr key={sched.id} style={{ background: isOverdue ? '#fff5f5' : 'transparent' }}>
                      <td><strong>{sched.task_name}</strong></td>
                      <td>{asset ? asset.name : 'General'}</td>
                      <td>{sched.frequency_days} days</td>
                      <td>{sched.last_completed_date ? format(new Date(sched.last_completed_date), 'MMM d') : 'Never'}</td>
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
                            onClick={() => markComplete(sched.id)}
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Mark Complete
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
      </div>
    </div>
  );
}

export default PMPage;
