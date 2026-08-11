import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function RequestForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assetId, setAssetId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/assets')
      .then(res => setAssets(res.data))
      .catch(err => console.error('Failed to load assets:', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/api/requests', {
        title,
        description,
        asset_id: assetId || null,
        priority,
        status: 'open'
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <h1>New Maintenance Request</h1>
      </div>

      <div className="container">
        <div className="card" style={{ maxWidth: '600px' }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label>Request Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g., Fix HVAC compressor noise"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows="5"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Asset (Optional)</label>
                <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                  <option value="">-- General Building --</option>
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RequestForm;
