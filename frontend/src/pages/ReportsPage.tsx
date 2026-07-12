import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

type ReportType = 'fuel-efficiency' | 'fleet-utilization' | 'operational-cost' | 'vehicle-roi';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('fuel-efficiency');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get(`/reports/${reportType}`);
      setData(res.data);
    } catch (err) {
      setError(`Failed to fetch report metrics.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const getCsvDownloadUrl = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    return `${API_URL}/reports/${reportType}/csv?token=${token}`; // Pass token to query if auth check allows it, or we trigger direct download using blob fetch in React
  };

  // Alternative secure download trigger using axios (handles Auth header)
  const handleDownloadCsv = async () => {
    try {
      const response = await client.get(`/reports/${reportType}/csv`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('CSV download failed.');
    }
  };

  return (
    <div className="container">
      {/* Report Selection Dropdown */}
      <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: 'bold' }}>Select Report:</label>
            <select
              className="form-control"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              style={{ width: '250px' }}
            >
              <option value="fuel-efficiency">Fuel Efficiency Report</option>
              <option value="fleet-utilization">Fleet Utilization Analytics</option>
              <option value="operational-cost">Operational Cost Overview</option>
              <option value="vehicle-roi">Asset ROI Calculations</option>
            </select>
          </div>

          <button onClick={handleDownloadCsv} className="btn btn-success">
            ↓ Download CSV spreadsheet
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <p>Calculating analytics...</p>
      ) : data ? (
        <div className="card">
          {reportType === 'fuel-efficiency' && (
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle Registration</th>
                  <th>Total Distance</th>
                  <th>Total Fuel Consumed</th>
                  <th>Fuel Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r: any) => (
                  <tr key={r.vehicle_id}>
                    <td style={{ fontWeight: 'bold' }}>{r.registration_number}</td>
                    <td>{r.total_distance_km.toLocaleString()} km</td>
                    <td>{r.total_fuel_liters.toLocaleString()} liters</td>
                    <td>
                      <strong style={{ color: r.efficiency_km_per_liter ? 'green' : 'inherit' }}>
                        {r.efficiency_km_per_liter ? `${r.efficiency_km_per_liter} km/L` : 'N/A (No fuel logs)'}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'fleet-utilization' && (
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', padding: '20px 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{data.utilization_pct}%</div>
                  <p className="text-muted">Current Fleet Utilization</p>
                </div>
                <div style={{ borderLeft: '1px solid #ddd', paddingLeft: '40px' }}>
                  <p><strong>Total Active Vehicles:</strong> {data.total_active_vehicles}</p>
                  <p><strong>Vehicles currently on Trip:</strong> {data.vehicles_on_trip}</p>
                </div>
              </div>
            </div>
          )}

          {reportType === 'operational-cost' && (
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle Registration</th>
                  <th>Fuel Costs</th>
                  <th>Maintenance Costs</th>
                  <th>Expenses Costs</th>
                  <th>Total Operational Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r: any) => (
                  <tr key={r.vehicle_id}>
                    <td style={{ fontWeight: 'bold' }}>{r.registration_number}</td>
                    <td>${r.fuel_cost.toLocaleString()}</td>
                    <td>${r.maintenance_cost.toLocaleString()}</td>
                    <td>${r.expense_cost.toLocaleString()}</td>
                    <td style={{ fontWeight: 'bold', fontSize: '15px' }}>${r.total_cost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'vehicle-roi' && (
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle Registration</th>
                  <th>Total Revenue</th>
                  <th>Total Operational Cost</th>
                  <th>Acquisition Cost</th>
                  <th>ROI (%)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r: any) => (
                  <tr key={r.vehicle_id}>
                    <td style={{ fontWeight: 'bold' }}>{r.registration_number}</td>
                    <td>${r.total_revenue.toLocaleString()}</td>
                    <td>${r.total_cost.toLocaleString()}</td>
                    <td>${r.acquisition_cost.toLocaleString()}</td>
                    <td>
                      <strong style={{ color: r.roi_pct && r.roi_pct > 0 ? 'green' : 'red' }}>
                        {r.roi_pct !== null ? `${r.roi_pct}%` : 'N/A'}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
};
export default ReportsPage;
