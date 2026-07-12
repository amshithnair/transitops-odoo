import React, { useState, useEffect } from 'react';
import client from '../api/client';

interface KPIs {
  active_vehicles: number;
  available_vehicles: number;
  vehicles_in_maintenance: number;
  active_trips: number;
  pending_trips: number;
  drivers_on_duty: number;
  fleet_utilization_pct: number;
}

export const DashboardPage: React.FC = () => {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [region, setRegion] = useState('');

  const fetchKPIs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (type) params.vehicle_type = type;
      if (status) params.vehicle_status = status;
      if (region) params.region = region;

      const res = await client.get('/dashboard/kpis', { params });
      setKpis(res.data);
    } catch (err) {
      setError('Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, [type, status, region]);

  return (
    <div className="container">
      {/* Filters Section */}
      <div className="card filters-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label style={{ fontSize: '12px' }}>Vehicle Type</label>
            <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All Types</option>
              <option value="Van">Van</option>
              <option value="Truck">Truck</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label style={{ fontSize: '12px' }}>Vehicle Status</label>
            <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="In Shop">In Shop</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label style={{ fontSize: '12px' }}>Region</label>
            <select className="form-control" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">All Regions</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
            </select>
          </div>

          <button onClick={fetchKPIs} className="btn btn-secondary" style={{ marginTop: '15px' }}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading && !kpis ? (
        <p>Loading KPIs...</p>
      ) : kpis ? (
        <div className="dashboard-grid">
          <div className="kpi-card">
            <h4>Active Vehicles</h4>
            <div className="kpi-value">{kpis.active_vehicles}</div>
            <p className="kpi-subtext">Registered operational assets</p>
          </div>

          <div className="kpi-card">
            <h4>Available Vehicles</h4>
            <div className="kpi-value">{kpis.available_vehicles}</div>
            <p className="kpi-subtext">Ready to dispatch</p>
          </div>

          <div className="kpi-card">
            <h4>Vehicles in Shop</h4>
            <div className="kpi-value">{kpis.vehicles_in_maintenance}</div>
            <p className="kpi-subtext">Active maintenance logs</p>
          </div>

          <div className="kpi-card">
            <h4>Active Trips</h4>
            <div className="kpi-value">{kpis.active_trips}</div>
            <p className="kpi-subtext">Trips currently in progress</p>
          </div>

          <div className="kpi-card">
            <h4>Pending Trips</h4>
            <div className="kpi-value">{kpis.pending_trips}</div>
            <p className="kpi-subtext">Trips in Draft status</p>
          </div>

          <div className="kpi-card">
            <h4>Drivers On Duty</h4>
            <div className="kpi-value">{kpis.drivers_on_duty}</div>
            <p className="kpi-subtext">Assigned to active routes</p>
          </div>

          <div className="kpi-card kpi-card-highlight">
            <h4>Fleet Utilization</h4>
            <div className="kpi-value">{kpis.fleet_utilization_pct}%</div>
            <p className="kpi-subtext">Vehicles on trip / total active</p>
          </div>
        </div>
      ) : null}
    </div>
  );
};
export default DashboardPage;
