import React, { useState } from 'react';
import client from '../api/client';
import { useData } from '../hooks/useData';
import type { ReportData, Vehicle } from '../types';
import { fmtNum } from '../utils/status';
import { PageHead, Loader, Kpi } from '../components/ui';
import { IconDownload, IconChart } from '../components/Icons';

export const ReportsPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [vehFilter, setVehFilter] = useState('');
  
  const params: Record<string, unknown> = {};
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  if (vehFilter) params.vehicle_id = vehFilter;
  
  // Note: API returns individual report lists on separate endpoints, but /reports/summary gives aggregate data.
  const { data: summary, loading, error } = useData<ReportData>('/reports/summary', params);
  const { data: vehData } = useData<{ items?: Vehicle[] } | Vehicle[]>('/vehicles');
  const vehicles: Vehicle[] = Array.isArray(vehData) ? vehData : (vehData?.items ?? []);
  
  const s = summary;

  // Functions to trigger CSV downloads directly from the backend endpoints
  const downloadCsv = async (endpoint: string, filename: string) => {
    try {
      const q = new URLSearchParams();
      if (dateFrom) q.append('date_from', dateFrom);
      if (dateTo) q.append('date_to', dateTo);
      if (vehFilter) q.append('vehicle_id', vehFilter);
      
      const res = await client.get(`/reports/${endpoint}/csv?${q.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('Failed to download CSV', e);
      alert('Failed to download report.');
    }
  };

  const chartMax = s ? Math.max(...(s.monthly_revenue || []).map(m => m.value), 1) : 1;

  return (
    <>
      <PageHead title="Reports & Analytics" sub="Financial performance & efficiency metrics">
        <div className="filters" style={{ marginBottom: 0 }}>
          <div className="filter-group"><label>Vehicle</label><select className="select" value={vehFilter} onChange={(e) => setVehFilter(e.target.value)}><option value="">All</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select></div>
          <div className="filter-group"><label>From</label><input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
          <div className="filter-group"><label>To</label><input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
        </div>
      </PageHead>

      {loading ? <Loader /> : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : !s ? (
        <div className="card card-pad text-muted text-center py-40">No data found for this period.</div>
      ) : (
        <>
          <div className="kpi-row mb-20">
            <Kpi label="Fuel Efficiency" value={s.fuel_efficiency_kmpl != null ? `${s.fuel_efficiency_kmpl} km/L` : 'N/A'} color="var(--green)" icon={<IconChart />} sub="Fleet average" />
            <Kpi label="Fleet Utilization" value={`${s.fleet_utilization_pct}%`} color="var(--blue)" icon={<IconChart />} sub="Active vs Total" />
            <Kpi label="Operational Cost" value={`₹${fmtNum(s.operational_cost)}`} color="var(--amber)" icon={<IconChart />} sub="Fuel + Maintenance + Expenses" />
            <Kpi label="Avg Vehicle ROI" value={s.vehicle_roi_pct != null ? `${s.vehicle_roi_pct}%` : 'N/A'} color="var(--accent)" icon={<IconChart />} sub="(Revenue - Cost) / Asset Value" />
          </div>

          <div className="two-col mb-20">
            <div className="card card-pad">
              <div className="card-head" style={{ padding: '0 0 16px', border: 'none' }}>
                <h3 style={{ margin: 0 }}>Monthly Revenue</h3>
              </div>
              <div className="bars">
                {s.monthly_revenue?.map((m) => (
                  <div key={m.month} className="bar-col">
                    <div className="bar-val">₹{fmtNum(m.value)}</div>
                    <div className="bar" style={{ height: `${Math.max(4, (m.value / chartMax) * 100)}%` }} />
                    <div className="bar-label">{m.month}</div>
                  </div>
                ))}
                {(!s.monthly_revenue || s.monthly_revenue.length === 0) && <div className="text-muted">No revenue data for selected filters.</div>}
              </div>
            </div>

            <div className="card card-pad">
              <div className="card-head" style={{ padding: '0 0 16px', border: 'none' }}>
                <h3 style={{ margin: 0 }}>Costliest Vehicles (Top 5)</h3>
              </div>
              <div>
                {s.costliest_vehicles?.map((v) => (
                  <div key={v.label} className="statbar-row">
                    <div className="statbar-label mono">{v.label}</div>
                    <div className="statbar-track">
                      <div className="statbar-fill bg-amber" style={{ width: `${Math.max(5, (v.value / (s.costliest_vehicles[0]?.value || 1)) * 100)}%`, background: 'var(--amber)' }} />
                    </div>
                    <div className="statbar-val">₹{fmtNum(v.value)}</div>
                  </div>
                ))}
                {(!s.costliest_vehicles || s.costliest_vehicles.length === 0) && <div className="text-muted">No operational cost data for selected filters.</div>}
              </div>
            </div>
          </div>
          
          <div className="card mb-20">
            <div className="card-head">
              <h3>Available Reports (CSV)</h3>
            </div>
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  <tr>
                    <td><strong>Fuel Efficiency Report</strong><div className="text-muted text-faint">Distance, fuel consumption, and km/L per vehicle</div></td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-ghost" onClick={() => downloadCsv('fuel-efficiency', 'fuel_efficiency.csv')}><IconDownload size={15}/> Download CSV</button></td>
                  </tr>
                  <tr>
                    <td><strong>Operational Cost Report</strong><div className="text-muted text-faint">Fuel + Maintenance + Expense breakdown per vehicle</div></td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-ghost" onClick={() => downloadCsv('operational-cost', 'operational_cost.csv')}><IconDownload size={15}/> Download CSV</button></td>
                  </tr>
                  <tr>
                    <td><strong>Vehicle ROI Report</strong><div className="text-muted text-faint">Revenue vs Costs against Acquisition Cost</div></td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-ghost" onClick={() => downloadCsv('vehicle-roi', 'vehicle_roi.csv')}><IconDownload size={15}/> Download CSV</button></td>
                  </tr>
                  <tr>
                    <td><strong>Fleet Utilization Report</strong><div className="text-muted text-faint">Active vs Total fleet utilization percentage</div></td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-ghost" onClick={() => downloadCsv('fleet-utilization', 'fleet_utilization.csv')}><IconDownload size={15}/> Download CSV</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
};
export default ReportsPage;
