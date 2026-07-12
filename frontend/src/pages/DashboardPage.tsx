import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../lib/useData';
import type { KPIs, Trip } from '../lib/types';
import { fmtNum } from '../lib/status';
import { demoKpis } from '../lib/demo';
import { PageHead, Kpi, StatBars } from '../components/ui';
import { IconTruck, IconUsers, IconRoute, IconFuel, IconChart, IconWrench, IconClock } from '../components/Icons';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [vehType, setVehType] = useState('');
  const [region, setRegion] = useState('');

  const params: Record<string, unknown> = {};
  if (vehType) params.vehicle_type = vehType;
  if (region) params.region = region;

  const { data: kpis, loading, error } = useData<KPIs>('/dashboard/kpis', demoKpis);
  const { data: tripsData } = useData<{ items?: Trip[] } | Trip[]>('/trips');
  const trips: Trip[] = Array.isArray(tripsData) ? tripsData : (tripsData?.items ?? []);

  const k = kpis;
  const recentTrips = trips.slice(0, 5);

  // Status bars from live data
  const statusBars = (k?.vehicle_status_breakdown || []).map(s => ({
    label: s.label,
    value: s.value,
    color: s.color,
  }));

  return (
    <>
      <PageHead title={`Welcome back, ${user?.name ?? 'Operator'}`} sub="Fleet operations overview & KPIs">
        <div className="filters" style={{ marginBottom: 0 }}>
          <div className="filter-group"><label>Type</label><select className="select" value={vehType} onChange={(e) => setVehType(e.target.value)}><option value="">All</option><option>Van</option><option>Truck</option><option>Mini</option></select></div>
          <div className="filter-group"><label>Region</label><select className="select" value={region} onChange={(e) => setRegion(e.target.value)}><option value="">All</option><option>North</option><option>South</option><option>East</option><option>West</option></select></div>
        </div>
      </PageHead>

      {loading ? <div>Loading...</div> : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : !k ? (
        <div className="text-muted">No dashboard data available.</div>
      ) : (
        <>
          <div className="kpi-row mb-20">
            <Kpi label="Total Vehicles" value={k.total_vehicles} color="var(--blue)" icon={<IconTruck />} sub={`${k.available_vehicles} available`} />
            <Kpi label="Total Drivers" value={k.total_drivers} color="var(--green)" icon={<IconUsers />} sub={`${k.available_drivers} available`} />
            <Kpi label="Active Trips" value={k.active_trips} color="var(--accent)" icon={<IconRoute />} sub={`${k.pending_trips} pending`} />
            <Kpi label="Fleet Utilization" value={`${k.fleet_utilization_pct}%`} color="var(--blue)" icon={<IconChart />} sub={`${k.drivers_on_duty} drivers on duty`} />
          </div>

          <div className="kpi-row mb-20">
            <Kpi label="Total Fuel Cost" value={`₹${fmtNum(k.total_fuel_cost)}`} color="var(--amber)" icon={<IconFuel />} sub="All-time fuel spend" />
            <Kpi label="Monthly Expense" value={`₹${fmtNum(k.monthly_expense)}`} color="var(--red)" icon={<IconChart />} sub="This month (fuel + expenses)" />
            <Kpi label="Avg Mileage" value={k.average_mileage != null ? `${k.average_mileage} km/L` : 'N/A'} color="var(--green)" icon={<IconFuel />} sub="From completed trips" />
            <Kpi label="In Maintenance" value={k.vehicles_in_maintenance} color="var(--amber)" icon={<IconWrench />} sub="Vehicles in shop" />
          </div>

          <div className="two-col">
            <div className="card card-pad">
              <div className="card-title mb-16">Vehicle Status Breakdown</div>
              {statusBars.length > 0 ? <StatBars data={statusBars} /> : <div className="text-muted">No data available.</div>}
            </div>

            <div className="card card-pad">
              <div className="card-title mb-16">Recent Activity</div>
              {recentTrips.length > 0 ? recentTrips.map((t) => (
                <div key={t.id} className="live-card">
                  <div className="live-top">
                    <div className="live-id">{t.code || t.id.slice(0, 8)}</div>
                    <span className={`badge ${t.status === 'Completed' ? 'b-green' : t.status === 'Dispatched' ? 'b-blue' : t.status === 'Draft' ? 'b-amber' : 'b-gray'}`}><span className="dot" />{t.status}</span>
                  </div>
                  <div className="live-route">{t.source} → {t.destination}</div>
                  <div className="live-foot">
                    <span className="text-muted">{t.vehicle_label || '—'} · {t.driver_label || '—'}</span>
                    {t.eta && <span className="text-faint"><IconClock size={12} /> {t.eta}</span>}
                  </div>
                </div>
              )) : <div className="text-muted">No recent trips.</div>}
            </div>
          </div>
        </>
      )}
    </>
  );
};
export default DashboardPage;
