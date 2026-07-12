import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicle_id: string;
  driver_id: string;
  cargo_weight_kg: number;
  planned_distance_km: number;
  actual_distance_km: number | null;
  fuel_consumed_liters: number | null;
  revenue: number;
  status: string;
  created_by: string;
  dispatched_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

interface Vehicle {
  id: string;
  registration_number: string;
  name_model: string;
  status: string;
}

interface Driver {
  id: string;
  name: string;
  status: string;
}

export const TripsPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { hasRole, user } = useAuth();
  const isManager = hasRole(['fleet_manager']);
  const isDriver = hasRole(['driver']);
  const canCreate = isManager || isDriver;

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // Create Form fields
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [cargoWeight, setCargoWeight] = useState(0);
  const [plannedDistance, setPlannedDistance] = useState(0);
  const [revenue, setRevenue] = useState(0);

  // Complete Form fields
  const [actualDistance, setActualDistance] = useState(0);
  const [fuelConsumed, setFuelConsumed] = useState(0);
  const [finalOdometer, setFinalOdometer] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const tripsRes = await client.get('/trips');
      setTrips(tripsRes.data);
    } catch (err) {
      setError('Failed to fetch trips.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const vehRes = await client.get('/vehicles');
      setVehicles(vehRes.data);
      const driRes = await client.get('/drivers');
      setDrivers(driRes.data);
    } catch (e) {
      // Fail silently for options
    }
  };

  useEffect(() => {
    fetchTrips();
    fetchOptions();
  }, []);

  const handleCreateOpen = () => {
    setSource('');
    setDestination('');
    setSelectedVehicle('');
    setSelectedDriver('');
    setCargoWeight(0);
    setPlannedDistance(0);
    setRevenue(0);
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      source,
      destination,
      vehicle_id: selectedVehicle,
      driver_id: selectedDriver,
      cargo_weight_kg: cargoWeight,
      planned_distance_km: plannedDistance,
      revenue,
    };

    try {
      await client.post('/trips', payload);
      setShowCreateModal(false);
      fetchTrips();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create trip draft.');
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      await client.post(`/trips/${id}/dispatch`);
      fetchTrips();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Dispatch failed.');
    }
  };

  const handleCompleteOpen = (id: string, plannedDist: number) => {
    setActiveTripId(id);
    setActualDistance(plannedDist);
    setFuelConsumed(0);
    setFinalOdometer('');
    setFormError(null);
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload: any = {
      actual_distance_km: actualDistance,
      fuel_consumed_liters: fuelConsumed,
    };
    if (finalOdometer) {
      payload.final_odometer_km = Number(finalOdometer);
    }

    try {
      await client.post(`/trips/${activeTripId}/complete`, payload);
      setShowCompleteModal(false);
      fetchTrips();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to complete trip.');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this trip?')) return;
    try {
      await client.post(`/trips/${id}/cancel`);
      fetchTrips();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Cancellation failed.');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <h2>Trips Management</h2>
        {canCreate && (
          <button onClick={handleCreateOpen} className="btn btn-primary">
            + Plan Trip Draft
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <p>Loading trips...</p>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Vehicle ID</th>
                <th>Driver ID</th>
                <th>Cargo Weight</th>
                <th>Planned Dist</th>
                <th>Revenue</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.source}</strong> → <strong>{t.destination}</strong>
                  </td>
                  <td>
                    {vehicles.find(v => v.id === t.vehicle_id)?.registration_number || t.vehicle_id.slice(0, 8)}
                  </td>
                  <td>
                    {drivers.find(d => d.id === t.driver_id)?.name || t.driver_id.slice(0, 8)}
                  </td>
                  <td>{t.cargo_weight_kg.toLocaleString()} kg</td>
                  <td>{t.planned_distance_km} km</td>
                  <td>${t.revenue.toLocaleString()}</td>
                  <td>
                    <span className={`status-badge status-${t.status.toLowerCase().replace(' ', '-')}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>
                    {t.status === 'Draft' && isManager && (
                      <button onClick={() => handleDispatch(t.id)} className="btn btn-success btn-sm" style={{ marginRight: '5px' }}>
                        Dispatch
                      </button>
                    )}
                    {t.status === 'Dispatched' && (isManager || isDriver) && (
                      <button onClick={() => handleCompleteOpen(t.id, t.planned_distance_km)} className="btn btn-primary btn-sm" style={{ marginRight: '5px' }}>
                        Complete
                      </button>
                    )}
                    {(t.status === 'Draft' || t.status === 'Dispatched') && isManager && (
                      <button onClick={() => handleCancel(t.id)} className="btn btn-danger btn-sm">
                        Cancel
                      </button>
                    )}
                    {t.status === 'Completed' && (
                      <span className="text-muted" style={{ fontSize: '12px' }}>Actual: {t.actual_distance_km}km / {t.fuel_consumed_liters}L</span>
                    )}
                    {t.status === 'Cancelled' && (
                      <span className="text-muted" style={{ fontSize: '12px' }}>Cancelled</span>
                    )}
                  </td>
                </tr>
              ))}
              {trips.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center' }} className="text-muted">
                    No trips recorded.
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
            <h3>Plan Trip (Draft)</h3>
            {formError && <div className="alert alert-danger">{formError}</div>}
            
            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Source / Origin</label>
                  <input
                    type="text"
                    className="form-control"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    required
                    placeholder="Warehouse A"
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Destination</label>
                  <input
                    type="text"
                    className="form-control"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                    placeholder="Depot B"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Vehicle Selection</label>
                  <select
                    className="form-control"
                    value={selectedVehicle}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                    required
                  >
                    <option value="">Choose Vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} - {v.name_model} ({v.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Driver Selection</label>
                  <select
                    className="form-control"
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    required
                  >
                    <option value="">Choose Driver...</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Cargo Weight (kg)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(Number(e.target.value))}
                    required
                    min={1}
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Planned Distance (km)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={plannedDistance}
                    onChange={(e) => setPlannedDistance(Number(e.target.value))}
                    required
                    min={1}
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Estimated Revenue ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={revenue}
                    onChange={(e) => setRevenue(Number(e.target.value))}
                    required
                    min={0}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Complete Trip routes</h3>
            <p className="text-muted" style={{ fontSize: '12px' }}>Enter final parameters to update vehicle mileage and log fuel efficiency.</p>
            {formError && <div className="alert alert-danger">{formError}</div>}

            <form onSubmit={handleCompleteSubmit}>
              <div className="form-group">
                <label>Actual Distance Traveled (km)</label>
                <input
                  type="number"
                  className="form-control"
                  value={actualDistance}
                  onChange={(e) => setActualDistance(Number(e.target.value))}
                  required
                  min={0.1}
                  step="any"
                />
              </div>

              <div className="form-group">
                <label>Fuel Consumed (liters)</label>
                <input
                  type="number"
                  className="form-control"
                  value={fuelConsumed}
                  onChange={(e) => setFuelConsumed(Number(e.target.value))}
                  required
                  min={0.1}
                  step="any"
                />
              </div>

              <div className="form-group">
                <label>Final Odometer Reading (km - Optional)</label>
                <input
                  type="number"
                  className="form-control"
                  value={finalOdometer}
                  onChange={(e) => setFinalOdometer(e.target.value)}
                  placeholder="Leave empty to auto-increment by actual distance"
                  min={0}
                  step="any"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowCompleteModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Mark Completed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default TripsPage;
