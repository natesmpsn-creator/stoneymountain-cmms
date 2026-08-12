import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function AssetsPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    location: '',
    description: ''
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const res = await axios.get('/api/assets');
      setAssets(res.data);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const assets = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 2) continue;

      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });

      const name = obj['unit number'] || obj['name'] || '';
      const location = obj['service area'] || obj['location of air handler'] || '';
      const category = obj['manufacturer'] || 'HVAC';
      const description = [
        obj['notes'] || '',
        obj['model #'] ? `Model: ${obj['model #']}` : '',
        obj['serial #'] ? `Serial: ${obj['serial #']}` : '',
        obj['approx year replaced/installed'] ? `Year: ${obj['approx year replaced/installed']}` : ''
      ].filter(Boolean).join(' | ');

      if (name) {
        assets.push({
          name,
          category,
          location,
          description
        });
      }
    }

    return assets;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError('');
    setUploadSuccess('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csv = event.target.result;
        const parsed = parseCSV(csv);

        if (parsed.length === 0) {
          setUploadError('No valid assets found in CSV');
          return;
        }

        const res = await axios.post('/api/assets/bulk', { assets: parsed });
        setUploadSuccess(`Successfully imported ${res.data.count} assets`);
        fetchAssets();
        setTimeout(() => setUploadSuccess(''), 3000);
      } catch (err) {
        setUploadError(err.response?.data?.error || 'Upload failed');
      }
    };
    reader.readAsText(file);
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    setUploadError('');

    try {
      if (editingId) {
        await axios.patch(`/api/assets/${editingId}`, formData);
        setEditingId(null);
      } else {
        await axios.post('/api/assets', formData);
      }
      setFormData({ name: '', category: '', location: '', description: '' });
      setShowForm(false);
      fetchAssets();
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to save asset');
    }
  };

  const startEdit = (asset) => {
    setEditingId(asset.id);
    setFormData({
      name: asset.name,
      category: asset.category,
      location: asset.location,
      description: asset.description
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', category: '', location: '', description: '' });
    setShowForm(false);
  };

  return (
    <div>
      <div className="header">
        <h1>Assets & Equipment</h1>
        <button className="secondary" onClick={() => navigate('/dashboard')}>Back</button>
      </div>

      <div className="container">
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Equipment ({assets.length})</h3>
          {loading ? (
            <p>Loading...</p>
          ) : assets.length === 0 ? (
            <p style={{ color: '#666' }}>No equipment added yet. Add manually or import from CSV.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => (
                  <tr key={asset.id}>
                    <td><strong>{asset.name}</strong></td>
                    <td>{asset.category}</td>
                    <td>{asset.location}</td>
                    <td style={{ fontSize: '12px', color: '#666' }}>{asset.description}</td>
                    <td>
                      <button
                        className="secondary"
                        onClick={() => startEdit(asset)}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '15px' }}>Import Equipment from CSV</h3>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Upload a CSV file with columns: Unit number, Location of Condensing Unit, Location of Air Handler, Service area, Thermostat Location, Notes, Approx Year Replaced/Installed, Manufacturer, Serial #, Model #, Size/Tons
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ marginBottom: '10px' }}
            />
            {uploadError && (
              <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
                {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
                {uploadSuccess}
              </div>
            )}
          </div>

          <hr style={{ margin: '20px 0' }} />

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '15px' }}>{editingId ? 'Edit Equipment' : 'Add Equipment Manually'}</h3>
            {!showForm ? (
              <button className="success" onClick={() => setShowForm(true)}>+ Add Asset</button>
            ) : (
              <form onSubmit={handleAddAsset} style={{ maxWidth: '500px' }}>
                <div className="form-group">
                  <label>Equipment Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., HVAC Unit #1"
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., HVAC, Heating, Cooling"
                  />
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Sanctuary, Basement"
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Serial #, model, year installed, etc."
                    rows="3"
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit">{editingId ? 'Update Asset' : 'Add Asset'}</button>
                  <button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default AssetsPage;
