import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  service_type: string;
  description: string | null;
  cost: number;
  odometer_at_service_km: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

interface Vehicle {
  id: string;
  registration_number: string;
  name_model: string;
  status: string;
}

export const MaintenancePage: React.FC = () => {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { hasRole } = useAuth();
  const isManager = hasRole(['fleet_manager']);

  // Modal / Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Form Fields
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState(0);
  const [odometer, setOdometer] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const logsRes = await client.get('/maintenance');
      setLogs(logsRes.data);
    } catch (err) {
      setError('Failed to fetch maintenance database.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const vehRes = await client.get('/vehicles');
      setVehicles(vehRes.data);
    } catch (e) {
      // Fail silently
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchVehicles();
  }, []);

  const openCreate = () => {
    setSelectedVehicle('');
    setServiceType('');
    setDescription('');
    setCost(0);
    setOdometer(0);
    setFormError(null);
    setShowCreateModal(true);
  };

  const openClose = (logId: string) => {
    setSelectedLogId(logId);
    setCost(0);
    setDescription('');
    setFormError(null);
    setShowCloseModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      vehicle_id: selectedVehicle,
      service_type: serviceType,
      description: description || null,
      cost,
      odometer_at_service_km: odometer || null,
    };

    try {
      await client.post('/maintenance', payload);
      setShowCreateModal(false);
      fetchLogs();
      fetchVehicles(); // update vehicle statuses in view
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to open maintenance log.');
    }
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      cost,
      description: description || null,
    };

    try {
      await client.post(`/maintenance/${selectedLogId}/close`, payload);
      setShowCloseModal(false);
      fetchLogs();
      fetchVehicles();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to close maintenance log.');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <h2>Maintenance Workshop</h2>
        {isManager && (
          <button onClick={openCreate} className="btn btn-primary">
            + Open Maintenance Log
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <p>Loading workshop logs...</p>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Service Type</th>
                <th>Cost</th>
                <th>Odometer Reading</th>
                <th>Opened Date</th>
                <th>Closed Date</th>
                <th>Status</th>
                {isManager && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 'bold' }}>
                    {vehicles.find(v => v.id === l.vehicle_id)?.registration_number || l.vehicle_id.slice(0, 8)}
                  </td>
                  <td>
                    <strong>{l.service_type}</strong>
                    {l.description && <div style={{ fontSize: '11px', color: '#666' }}>{l.description}</div>}
                  </td>
                  <td>${l.cost.toLocaleString()}</td>
                  <td>{l.odometer_at_service_km ? `${l.odometer_at_service_km.toLocaleString()} km` : '—'}</td>
                  <td>{new Date(l.opened_at).toLocaleDateString()}</td>
                  <td>{l.closed_at ? new Date(l.closed_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <span className={`status-badge status-${l.status.toLowerCase()}`}>
                      {l.status}
                    </span>
                  </td>
                  {isManager && (
                    <td>
                      {l.status === 'Open' ? (
                        <button onClick={() => openClose(l.id)} className="btn btn-success btn-sm">
                          Close Service
                        </button>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '12px' }}>Completed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={isManager ? 8 : 7} style={{ textAlign: 'center' }} className="text-muted">
                    No workshop logs recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Open Maintenance Record</h3>
            <p className="text-muted" style={{ fontSize: '12px' }}>This will set the vehicle's status to 'In Shop' and remove it from selection pools (Rule 9).</p>
            {formError && <div className="alert alert-danger">{formError}</div>}

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>Select Vehicle</label>
                <select
                  className="form-control"
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  required
                >
                  <option value="">Choose Vehicle...</option>
                  {vehicles.filter(v => v.status !== 'Retired').map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.name_model} ({v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Service Type</label>
                <input
                  type="text"
                  className="form-control"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  required
                  placeholder="e.g. Brake Pads Replacement, Oil Change"
                />
              </div>

              <div className="form-group">
                <label>Odometer at Service (km - Optional)</label>
                <input
                  type="number"
                  className="form-control"
                  value={odometer}
                  onChange={(e) => setOdometer(Number(e.target.value))}
                  min={0}
                />
              </div>

              <div className="form-group">
                <label>Estimated Cost ($)</label>
                <input
                  type="number"
                  className="form-control"
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                  min={0}
                />
              </div>

              <div className="form-group">
                <label>Details / Description</label>
                <textarea
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Service details..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Open Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {showCloseModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Close Maintenance Log</h3>
            <p className="text-muted" style={{ fontSize: '12px' }}>This restores the vehicle status to 'Available' unless it is 'Retired' (Rule 10).</p>
            {formError && <div className="alert alert-danger">{formError}</div>}

            <form onSubmit={handleCloseSubmit}>
              <div className="form-group">
                <label>Final Cost ($)</label>
                <input
                  type="number"
                  className="form-control"
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                  required
                  min={0}
                />
              </div>

              <div className="form-group">
                <label>Service Description Update</label>
                <textarea
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Completed actions..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowCloseModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Close Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default MaintenancePage;
