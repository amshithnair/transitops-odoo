import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Vehicle {
  id: string;
  registration_number: string;
  name_model: string;
  type: string;
  max_load_capacity_kg: number;
  odometer_km: number;
  acquisition_cost: number;
  status: string;
  region: string | null;
  created_at: string;
}

export const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hasRole } = useAuth();

  const isManager = hasRole(['fleet_manager']);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [regNum, setRegNum] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('Van');
  const [maxLoad, setMaxLoad] = useState(2500);
  const [odometer, setOdometer] = useState(0);
  const [acqCost, setAcqCost] = useState(0);
  const [status, setStatus] = useState('Available');
  const [region, setRegion] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await client.get('/vehicles');
      setVehicles(res.data);
    } catch (err) {
      setError('Failed to load vehicles registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setRegNum('');
    setModel('');
    setType('Van');
    setMaxLoad(2500);
    setOdometer(0);
    setAcqCost(0);
    setStatus('Available');
    setRegion('');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingId(v.id);
    setRegNum(v.registration_number);
    setModel(v.name_model);
    setType(v.type);
    setMaxLoad(v.max_load_capacity_kg);
    setOdometer(v.odometer_km);
    setAcqCost(v.acquisition_cost);
    setStatus(v.status);
    setRegion(v.region || '');
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      registration_number: regNum,
      name_model: model,
      type,
      max_load_capacity_kg: maxLoad,
      odometer_km: odometer,
      acquisition_cost: acqCost,
      status,
      region: region || null,
    };

    try {
      if (editingId) {
        await client.put(`/vehicles/${editingId}`, payload);
      } else {
        await client.post('/vehicles', payload);
      }
      setShowModal(false);
      fetchVehicles();
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setFormError(err.response.data.detail);
      } else {
        setFormError('Submission failed. Please check inputs.');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this vehicle?')) return;
    try {
      await client.delete(`/vehicles/${id}`);
      fetchVehicles();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete vehicle.');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <h2>Vehicle Registry</h2>
        {isManager && (
          <button onClick={openCreateModal} className="btn btn-primary">
            + Register Vehicle
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <p>Loading registry...</p>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Model</th>
                <th>Type</th>
                <th>Max Payload</th>
                <th>Odometer</th>
                <th>Region</th>
                <th>Status</th>
                {isManager && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 'bold' }}>{v.registration_number}</td>
                  <td>{v.name_model}</td>
                  <td>{v.type}</td>
                  <td>{v.max_load_capacity_kg.toLocaleString()} kg</td>
                  <td>{v.odometer_km.toLocaleString()} km</td>
                  <td>{v.region || '—'}</td>
                  <td>
                    <span className={`status-badge status-${v.status.toLowerCase().replace(' ', '-')}`}>
                      {v.status}
                    </span>
                  </td>
                  {isManager && (
                    <td>
                      <button onClick={() => openEditModal(v)} className="btn btn-secondary btn-sm" style={{ marginRight: '5px' }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(v.id)} className="btn btn-danger btn-sm">
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={isManager ? 8 : 7} style={{ textAlign: 'center' }} className="text-muted">
                    No vehicles registered.
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
            <h3>{editingId ? 'Edit Vehicle Details' : 'Register New Vehicle'}</h3>
            {formError && <div className="alert alert-danger">{formError}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Registration Number (Unique)</label>
                <input
                  type="text"
                  className="form-control"
                  value={regNum}
                  onChange={(e) => setRegNum(e.target.value)}
                  required
                  placeholder="e.g. VAN-05"
                />
              </div>

              <div className="form-group">
                <label>Make & Model</label>
                <input
                  type="text"
                  className="form-control"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  required
                  placeholder="e.g. Ford Transit 2024"
                />
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Type</label>
                  <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Max Payload Capacity (kg)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={maxLoad}
                    onChange={(e) => setMaxLoad(Number(e.target.value))}
                    required
                    min={1}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Odometer (km)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={odometer}
                    onChange={(e) => setOdometer(Number(e.target.value))}
                    required
                    min={0}
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Acquisition Cost ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={acqCost}
                    onChange={(e) => setAcqCost(Number(e.target.value))}
                    required
                    min={0}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Status</label>
                  <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="In Shop">In Shop</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Region</label>
                  <input
                    type="text"
                    className="form-control"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g. North"
                  />
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
export default VehiclesPage;
