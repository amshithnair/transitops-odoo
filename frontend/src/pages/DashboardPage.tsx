import React, { useState } from 'react';
import { useData } from '../lib/useData';
import { demoKpis, demoTrips, demoStatusBreakdown } from '../lib/demo';
import type { KPIs, Trip } from '../lib/types';
import { PageHead, Kpi, StatBars, Badge } from '../components/ui';
import { IconTruck, IconRoute, IconUsers, IconChart, IconWrench, IconClock } from '../components/Icons';

const KPI_DEFS = (k: KPIs) => [
  { label: 'Active Vehicles',   value: k.active_vehicles,          color: 'var(--blue)',  icon: <IconTruck />,  sub: 'Registered & operational', tip: 'Vehicles not Retired.' },
  { label: 'Available Vehicles',value: k.available_vehicles,        color: 'var(--green)', icon: <IconTruck />,  sub: 'Ready to dispatch', tip: 'Status = Available.' },
  { label: 'In Maintenance',    value: k.vehicles_in_maintenance,   color: 'var(--amber)', icon: <IconWrench />, sub: 'Currently In Shop', tip: 'Vehicles with an active maintenance record.' },
  { label: 'Active Trips',      value: k.active_trips,              color: 'var(--blue)',  icon: <IconRoute />,  sub: 'On the road now', tip: 'Trips with status = Dispatched.' },
  { label: 'Pending Trips',     value: k.pending_trips,             color: 'var(--gray)',  icon: <IconClock />,  sub: 'In Draft', tip: 'Trips created but not dispatched.' },
  { label: 'Drivers On Duty',   value: k.drivers_on_duty,           color: 'var(--green)', icon: <IconUsers />,  sub: 'Assigned & active', tip: 'Drivers not Off Duty / Suspended.' },
  { label: 'Fleet Utilization', value: `${k.fleet_utilization_pct}%`,color: 'var(--accent)',icon: <IconChart />,  sub: 'On-trip / active', tip: 'On Trip vehicles ÷ active vehicles.' },
];

export const DashboardPage: React.FC = () => {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [region, setRegion] = useState('');

  const params: Record<string, string> = {};
  if (type) params.vehicle_type = type;
  if (status) params.vehicle_status = status;
  if (region) params.region = region;

  const { data: kpis } = useData<KPIs>('/dashboard/kpis', demoKpis, params);
  const { data: trips } = useData<Trip[]>('/trips', demoTrips);

  const recent = (Array.isArray(trips) ? trips : demoTrips).slice(0, 6);

  return (
    <>
      <PageHead title="Dashboard" sub="Fleet operations at a glance" />

      <div className="filters">
        <div className="filter-group">
          <label>Vehicle Type</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option><option>Van</option><option>Truck</option><option>Mini</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option><option>Available</option><option>On Trip</option><option>In Shop</option><option>Retired</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Region</label>
          <select className="select" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">All</option><option>North</option><option>South</option><option>East</option><option>West</option>
          </select>
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom: 18 }}>
        {KPI_DEFS(kpis).map((d) => (
          <Kpi key={d.label} label={d.label} value={d.value} sub={d.sub} color={d.color} icon={d.icon} tip={d.tip} />
        ))}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-head"><h3>Recent Trips</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Trip</th><th>Vehicle</th><th>Driver</th><th>Status</th><th>ETA</th></tr></thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td className="mono">{t.code || t.id}</td>
                    <td>{t.vehicle_label || '—'}</td>
                    <td>{t.driver_label || '—'}</td>
                    <td><Badge status={t.status} /></td>
                    <td className="text-muted">{t.eta || t.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-pad">
          <div className="card-title mb-20">Vehicle Status</div>
          <StatBars data={demoStatusBreakdown} />
        </div>
      </div>
    </>
  );
};
export default DashboardPage;
