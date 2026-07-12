import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Driver {
  id: string;
  name: string;
  license_number: string;
  license_category: string;
  license_expiry_date: string;
  contact_number: string | null;
  safety_score: number;
  status: string;
  created_at: string;
}

export const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hasRole, user } = useAuth();

  const isManager = hasRole(['fleet_manager']);
  const isSafety = hasRole(['safety_officer']);
  const canWrite = isManager || isSafety;

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [licenseNum, setLicenseNum] = useState('');
  const [licenseCat, setLicenseCat] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [contactNum, setContactNum] = useState('');
  const [safetyScore, setSafetyScore] = useState(100);
  const [status, setStatus] = useState('Available');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await client.get('/drivers');
      setDrivers(res.data);
    } catch (err) {
      setError('Failed to load drivers database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setLicenseNum('');
    setLicenseCat('');
    setLicenseExpiry('');
    setContactNum('');
    setSafetyScore(100);
    setStatus('Available');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (d: Driver) => {
    setEditingId(d.id);
    setName(d.name);
    setLicenseNum(d.license_number);
    setLicenseCat(d.license_category);
    setLicenseExpiry(d.license_expiry_date);
    setContactNum(d.contact_number || '');
    setSafetyScore(d.safety_score);
    setStatus(d.status);
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // If safety officer, restrict payload to compliance fields only
    const payload: any = {};
    if (isSafety && editingId) {
      payload.license_number = licenseNum;
      payload.license_category = licenseCat;
      payload.license_expiry_date = licenseExpiry;
      payload.safety_score = safetyScore;
      payload.status = status;
    } else {
      payload.name = name;
      payload.license_number = licenseNum;
      payload.license_category = licenseCat;
      payload.license_expiry_date = licenseExpiry;
      payload.contact_number = contactNum || null;
      payload.safety_score = safetyScore;
      payload.status = status;
    }

    try {
      if (editingId) {
        await client.put(`/drivers/${editingId}`, payload);
      } else {
        await client.post('/drivers', payload);
      }
      setShowModal(false);
      fetchDrivers();
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setFormError(err.response.data.detail);
      } else {
        setFormError('Submission failed. Check compliance parameters.');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this driver?')) return;
    try {
      await client.delete(`/drivers/${id}`);
      fetchDrivers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete driver.');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <h2>Drivers Database</h2>
        {isManager && (
          <button onClick={openCreateModal} className="btn btn-primary">
            + Add Driver
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <p>Loading database...</p>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>License #</th>
                <th>Class</th>
                <th>License Expiry</th>
                <th>Contact</th>
                <th>Safety Score</th>
                <th>Status</th>
                {canWrite && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => {
                const isLicenseExpired = new Date(d.license_expiry_date) < new Date();
                return (
                  <tr key={d.id} className={isLicenseExpired ? 'row-highlight-danger' : ''}>
                    <td style={{ fontWeight: 'bold' }}>{d.name}</td>
                    <td>{d.license_number}</td>
                    <td>{d.license_category}</td>
                    <td style={{ color: isLicenseExpired ? 'red' : 'inherit', fontWeight: isLicenseExpired ? 'bold' : 'normal' }}>
                      {d.license_expiry_date} {isLicenseExpired && '(EXPIRED)'}
                    </td>
                    <td>{d.contact_number || '—'}</td>
                    <td>
                      <strong style={{ color: d.safety_score < 90 ? 'orange' : 'green' }}>
                        {d.safety_score}/100
                      </strong>
                    </td>
                    <td>
                      <span className={`status-badge status-${d.status.toLowerCase().replace(' ', '-')}`}>
                        {d.status}
                      </span>
                    </td>
                    {canWrite && (
                      <td>
                        <button onClick={() => openEditModal(d)} className="btn btn-secondary btn-sm" style={{ marginRight: '5px' }}>
                          Edit
                        </button>
                        {isManager && (
                          <button onClick={() => handleDelete(d.id)} className="btn btn-danger btn-sm">
                            Delete
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {drivers.length === 0 && (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} style={{ textAlign: 'center' }} className="text-muted">
                    No drivers registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>{editingId ? 'Edit Driver Details' : 'Register New Driver'}</h3>
            {isSafety && <p className="text-muted" style={{ fontSize: '12px' }}>* Safety Officer Mode: You can only edit compliance fields (license, score, status).</p>}
            {formError && <div className="alert alert-danger">{formError}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSafety && !!editingId} // Read-only for safety officer when editing
                  placeholder="e.g. Alex Johnson"
                />
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>License Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={licenseNum}
                    onChange={(e) => setLicenseNum(e.target.value)}
                    required
                    placeholder="e.g. DL-2024-0042"
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>License Category</label>
                  <input
                    type="text"
                    className="form-control"
                    value={licenseCat}
                    onChange={(e) => setLicenseCat(e.target.value)}
                    required
                    placeholder="e.g. C+E"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>License Expiry Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={licenseExpiry}
                    onChange={(e) => setLicenseExpiry(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Contact Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={contactNum}
                    onChange={(e) => setContactNum(e.target.value)}
                    disabled={isSafety && !!editingId} // Read-only for safety
                    placeholder="e.g. +1-555-0142"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Safety Score (0 - 100)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={safetyScore}
                    onChange={(e) => setSafetyScore(Number(e.target.value))}
                    required
                    min={0}
                    max={100}
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Status</label>
                  <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default DriversPage;
