import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function JobPlansPage() {
  const navigate = useNavigate();
  const [jobPlans, setJobPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    items: ['', '', '']
  });

  useEffect(() => {
    fetchJobPlans();
  }, []);

  const fetchJobPlans = async () => {
    try {
      const res = await axios.get('/api/job-plans');
      setJobPlans(res.data);
    } catch (err) {
      console.error('Failed to load job plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, '']
    });
  };

  const handleItemChange = (index, value) => {
    const newItems = [...formData.items];
    newItems[index] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Job plan name is required');
      return;
    }

    const filteredItems = formData.items.filter(item => item.trim());
    if (filteredItems.length === 0) {
      setError('Add at least one checklist item');
      return;
    }

    try {
      await axios.post('/api/job-plans', {
        name: formData.name,
        description: formData.description,
        items: filteredItems
      });

      setFormData({ name: '', description: '', items: ['', '', ''] });
      setShowForm(false);
      fetchJobPlans();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create job plan');
    }
  };

  return (
    <div>
      <div className="header">
        <h1>Job Plans & Checklists</h1>
        <button className="secondary" onClick={() => navigate('/dashboard')}>Back</button>
      </div>

      <div className="container">
        <div className="card">
          <h3 style={{ marginBottom: '15px' }}>Create Job Plan</h3>
          {error && (
            <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {!showForm ? (
            <button className="success" onClick={() => setShowForm(true)}>+ New Job Plan</button>
          ) : (
            <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
              <div className="form-group">
                <label>Job Plan Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Quarterly HVAC Inspection"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label>Checklist Items *</label>
                {formData.items.map((item, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleItemChange(index, e.target.value)}
                      placeholder={`Item ${index + 1}`}
                      style={{ flex: 1 }}
                    />
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleRemoveItem(index)}
                        style={{ padding: '8px 12px' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="secondary"
                  onClick={handleAddItem}
                  style={{ marginTop: '10px' }}
                >
                  + Add Item
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit">Create Job Plan</button>
                <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Job Plans ({jobPlans.length})</h3>
          {loading ? (
            <p>Loading...</p>
          ) : jobPlans.length === 0 ? (
            <p style={{ color: '#666' }}>No job plans yet. Create one to get started.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {jobPlans.map(plan => (
                <div key={plan.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '4px' }}>
                  <h4>{plan.name}</h4>
                  {plan.description && <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>{plan.description}</p>}
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <p style={{ marginBottom: '8px' }}><strong>Checklist items:</strong></p>
                    <ul style={{ marginLeft: '20px' }}>
                      {plan.items && plan.items.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobPlansPage;
