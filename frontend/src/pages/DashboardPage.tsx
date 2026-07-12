import React, { useState, useMemo } from 'react';
import { useData } from '../lib/useData';
import { demoTrips, demoVehicles, demoDrivers, demoMaintenance } from '../lib/demo';
import type { KPIs, Trip, Vehicle, Driver, Maintenance } from '../lib/types';
import { PageHead, Kpi, StatBars, Badge, CustomSelect } from '../components/ui';
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

/** Compute KPIs + status breakdown from local data arrays, respecting filters. */
function computeKpis(
  vehicles: Vehicle[],
  drivers: Driver[],
  trips: Trip[],
  maint: Maintenance[],
  filterType: string,
  filterStatus: string,
  filterRegion: string,
): { kpis: KPIs; breakdown: { label: string; value: number; color: string }[] } {
  const fv = vehicles.filter((v) => {
    if (filterType   && v.type   !== filterType)   return false;
    if (filterStatus && v.status !== filterStatus) return false;
    if (filterRegion && (v.region || '') !== filterRegion) return false;
    return true;
  });

  // Active drivers depend on which vehicles are in view (on-trip drivers for those vehicles)
  const activeLabelSet = new Set(fv.filter((v) => v.status === 'On Trip').map((v) => v.registration_number));
  const activeDriversCount = drivers.filter((d) => d.status !== 'Off Duty' && d.status !== 'Suspended').length;

  // For trips, we scope to vehicle labels in the filtered vehicle set when a type/region filter is on.
  const tripScope = (filterType || filterRegion)
    ? trips.filter((t) => t.vehicle_label && activeLabelSet.has(t.vehicle_label))
    : trips;

  const activeMaint = maint.filter((m) =>
    m.status === 'Active' && fv.some((v) => v.registration_number === m.vehicle_label)
  ).length;

  const active = fv.filter((v) => v.status !== 'Retired').length;
  const available = fv.filter((v) => v.status === 'Available').length;
  const onTrip = fv.filter((v) => v.status === 'On Trip').length;
  const dispatched = tripScope.filter((t) => t.status === 'Dispatched').length;
  const draft = tripScope.filter((t) => t.status === 'Draft').length;
  const utilPct = active > 0 ? Math.round((onTrip / active) * 100) : 0;

  const breakdown = [
    { label: 'Available', value: available,                                    color: 'var(--green)' },
    { label: 'On Trip',   value: onTrip,                                       color: 'var(--blue)'  },
    { label: 'In Shop',   value: fv.filter((v) => v.status === 'In Shop').length, color: 'var(--amber)' },
    { label: 'Retired',   value: fv.filter((v) => v.status === 'Retired').length, color: 'var(--red)'   },
  ];

  return {
    kpis: {
      active_vehicles: active,
      available_vehicles: available,
      vehicles_in_maintenance: activeMaint,
      active_trips: dispatched,
      pending_trips: draft,
      drivers_on_duty: activeDriversCount,
      fleet_utilization_pct: utilPct,
    },
    breakdown,
  };
}

export const DashboardPage: React.FC = () => {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [region, setRegion] = useState('');

  // Pull all live data (falls back to demo when backend is offline)
  const { data: vehicleData } = useData<Vehicle[]>('/vehicles', demoVehicles);
  const { data: driverData } = useData<Driver[]>('/drivers', demoDrivers);
  const { data: tripData } = useData<Trip[]>('/trips', demoTrips);
  const { data: maintData } = useData<Maintenance[]>('/maintenance', demoMaintenance);

  const vehicles = Array.isArray(vehicleData) ? vehicleData : demoVehicles;
  const drivers  = Array.isArray(driverData)  ? driverData  : demoDrivers;
  const trips    = Array.isArray(tripData)    ? tripData    : demoTrips;
  const maint    = Array.isArray(maintData)   ? maintData   : demoMaintenance;

  // Recompute KPIs reactively whenever filters change
  const { kpis, breakdown } = useMemo(
    () => computeKpis(vehicles, drivers, trips, maint, type, status, region),
    [vehicles, drivers, trips, maint, type, status, region]
  );

  // Recent trips table — filter by active filter set
  const recentTrips = useMemo(() => {
    const activeLabels = new Set(
      vehicles.filter((v) => {
        if (type   && v.type !== type)     return false;
        if (status && v.status !== status) return false;
        if (region && (v.region || '') !== region) return false;
        return true;
      }).map((v) => v.registration_number)
    );
    return trips
      .filter((t) => {
        if (!type && !status && !region) return true;
        return !t.vehicle_label || activeLabels.has(t.vehicle_label);
      })
      .slice(0, 8);
  }, [trips, vehicles, type, status, region]);

  // Regions from data
  const regions = [...new Set(vehicles.map((v) => v.region).filter(Boolean))].sort() as string[];

  return (
    <>
      <PageHead title="Dashboard" sub="Fleet operations at a glance" />

      <div className="filters">
        <div className="filter-group">
          <label>Vehicle Type</label>
          <div style={{ width: '140px' }}>
            <CustomSelect value={type} onChange={setType} options={[{value: '', label: 'All Types'}, 'Van', 'Truck', 'Mini']} placeholder="All Types" />
          </div>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <div style={{ width: '150px' }}>
            <CustomSelect value={status} onChange={setStatus} options={[{value: '', label: 'All Statuses'}, 'Available', 'On Trip', 'In Shop', 'Retired']} placeholder="All Statuses" />
          </div>
        </div>
        <div className="filter-group">
          <label>Region</label>
          <div style={{ width: '140px' }}>
            <CustomSelect value={region} onChange={setRegion} options={[{value: '', label: 'All Regions'}, ...regions]} placeholder="All Regions" />
          </div>
        </div>
        {(type || status || region) && (
          <div className="filter-group" style={{ justifyContent: 'flex-end', alignSelf: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setType(''); setStatus(''); setRegion(''); }}>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      <div className="kpi-row" style={{ marginBottom: 18 }}>
        {KPI_DEFS(kpis).map((d) => (
          <Kpi key={d.label} label={d.label} value={d.value} sub={d.sub} color={d.color} icon={d.icon} tip={d.tip} />
        ))}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-head"><h3>Recent Trips {(type || status || region) && '(filtered)'}</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Trip</th><th>Vehicle</th><th>Driver</th><th>Status</th><th>ETA / Note</th></tr></thead>
              <tbody className="table-animated">
                {recentTrips.length === 0 && (
                  <tr><td colSpan={5} className="empty-row">No trips match the current filter.</td></tr>
                )}
                {recentTrips.map((t) => (
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
          <div className="card-title mb-20">
            Vehicle Status {(type || region) && <span className="text-muted" style={{ fontSize: 12, fontWeight: 500 }}>({type || 'All'}{region ? ` · ${region}` : ''})</span>}
          </div>
          <StatBars data={breakdown} />
        </div>
      </div>
    </>
  );
};
export default DashboardPage;
