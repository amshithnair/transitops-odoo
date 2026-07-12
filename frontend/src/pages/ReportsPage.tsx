import React, { useState } from 'react';
import { useData } from '../lib/useData';
import { demoReport, demoVehicles, demoTrips, demoFuel, demoMaintenance } from '../lib/demo';
import type { ReportData, Vehicle, Trip, FuelLog, Maintenance } from '../lib/types';
import { fmtNum } from '../lib/status';
import { PageHead, Kpi, BarChart, StatBars, exportCsv } from '../components/ui';
import { IconDownload, IconFuel, IconChart, IconRoute } from '../components/Icons';

export const ReportsPage: React.FC = () => {
  const { data: vehData } = useData<Vehicle[]>('/vehicles', demoVehicles);
  const { data: tripData } = useData<Trip[]>('/trips', demoTrips);
  const { data: fuelData } = useData<FuelLog[]>('/fuel-logs', demoFuel);
  const { data: maintData } = useData<Maintenance[]>('/maintenance', demoMaintenance);
  const { data: apiReport } = useData<ReportData>('/reports', demoReport);

  const [vehFilter, setVehFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const vehicles = Array.isArray(vehData) ? vehData : demoVehicles;
  const trips = Array.isArray(tripData) ? tripData : demoTrips;
  const fuel = Array.isArray(fuelData) ? fuelData : demoFuel;
  const maint = Array.isArray(maintData) ? maintData : demoMaintenance;

  // Real computation from live fleet data (falls back to backend /reports if it returns a full payload,
  // otherwise recomputed client-side so ROI reflects actual per-trip revenue entered on completion).
  const totalFuelCost = fuel.reduce((s, f) => s + f.fuel_cost, 0);
  const totalMaintCost = maint.reduce((s, m) => s + m.cost, 0);
  const operationalCost = totalFuelCost + totalMaintCost;
  const totalAcqCost = vehicles.reduce((s, v) => s + v.acquisition_cost, 0);
  const completedTrips = trips.filter((t) => t.status === 'Completed');
  const totalRevenue = completedTrips.reduce((s, t) => s + (t.revenue || 0), 0);
  const roiPct = totalAcqCost > 0 ? ((totalRevenue - operationalCost) / totalAcqCost) * 100 : 0;

  const totalFuelL = completedTrips.reduce((s, t) => s + (t.fuel_consumed || 0), 0);
  const totalDist = completedTrips.reduce((s, t) => s + t.planned_distance_km, 0);
  const fuelEfficiency = totalFuelL > 0 ? totalDist / totalFuelL : 0;

  const activeVehicles = vehicles.filter((v) => v.status !== 'Retired');
  const onTrip = vehicles.filter((v) => v.status === 'On Trip');
  const utilizationPct = activeVehicles.length > 0 ? Math.round((onTrip.length / activeVehicles.length) * 100) : 0;

  const costByVehicle = new Map<string, number>();
  for (const f of fuel) costByVehicle.set(f.vehicle_label, (costByVehicle.get(f.vehicle_label) || 0) + f.fuel_cost);
  for (const m of maint) costByVehicle.set(m.vehicle_label, (costByVehicle.get(m.vehicle_label) || 0) + m.cost);
  const costliest = [...costByVehicle.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const hasLiveNumbers = totalFuelCost > 0 || totalMaintCost > 0;
  const r = hasLiveNumbers
    ? { fuel_efficiency_kmpl: Math.round(fuelEfficiency * 10) / 10 || demoReport.fuel_efficiency_kmpl, fleet_utilization_pct: utilizationPct, operational_cost: operationalCost, vehicle_roi_pct: Math.round(roiPct * 10) / 10, monthly_revenue: apiReport?.monthly_revenue?.length ? apiReport.monthly_revenue : demoReport.monthly_revenue }
    : demoReport;
  const costBars = (costliest.length ? costliest.map(([label, value]) => ({ label, value })) : demoReport.costliest_vehicles)
    .map((c, i) => ({ label: c.label, value: c.value, color: ['var(--red)', 'var(--amber)', 'var(--blue)'][i] || 'var(--blue)' }));

  const exportReport = () => exportCsv('analytics.csv', [
    { metric: 'Fuel Efficiency (km/l)', value: r.fuel_efficiency_kmpl },
    { metric: 'Fleet Utilization (%)', value: r.fleet_utilization_pct },
    { metric: 'Operational Cost (₹)', value: r.operational_cost },
    { metric: 'Vehicle ROI (%)', value: r.vehicle_roi_pct },
    { metric: 'Total Revenue (₹, completed trips)', value: totalRevenue },
    ...costBars.map((c) => ({ metric: `Cost — ${c.label}`, value: c.value })),
  ]);

  return (
    <>
      <PageHead title="Reports & Analytics" sub="Financial performance & efficiency metrics">
        <button className="btn btn-ghost" onClick={exportReport}><IconDownload size={15} />CSV</button>
        <div className="filters" style={{ marginBottom: 0 }}>
          <div className="filter-group"><label>Vehicle</label><select className="select" value={vehFilter} onChange={(e) => setVehFilter(e.target.value)}><option value="">All</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select></div>
          <div className="filter-group"><label>From</label><input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
          <div className="filter-group"><label>To</label><input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
        </div>
      </PageHead>

      <div className="kpi-row mb-20">
        <Kpi label="Fuel Efficiency" value={`${r.fuel_efficiency_kmpl} km/l`} color="var(--blue)" icon={<IconFuel />} sub="Distance ÷ Fuel" tip="Total planned distance ÷ total fuel consumed across completed trips." />
        <Kpi label="Fleet Utilization" value={`${r.fleet_utilization_pct}%`} color="var(--green)" icon={<IconChart />} sub="On-trip / active" tip="On Trip vehicles ÷ non-Retired vehicles." />
        <Kpi label="Operational Cost" value={`₹${fmtNum(r.operational_cost)}`} color="var(--amber)" icon={<IconRoute />} sub="Fuel + Maintenance" tip="Sum of all fuel logs + maintenance costs, live." />
        <Kpi label="Vehicle ROI" value={`${r.vehicle_roi_pct}%`} color="var(--accent)" icon={<IconChart />} sub="Return on assets" tip="(Revenue − (Maintenance + Fuel)) ÷ Acquisition Cost. Revenue = sum of per-trip revenue entered on trip completion." />
      </div>

      <div className="alert alert-info" style={{ fontFamily: 'var(--font-mono)' }}>ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost · Revenue = ₹{fmtNum(totalRevenue)} from {completedTrips.length} completed trip(s)</div>

      <div className="two-col">
        <div className="card card-pad">
          <div className="card-title mb-20">Monthly Revenue</div>
          <BarChart data={r.monthly_revenue} />
        </div>
        <div className="card card-pad">
          <div className="card-title mb-20">Top Costliest Vehicles</div>
          <StatBars data={costBars} />
        </div>
      </div>
    </>
  );
};
export default ReportsPage;
