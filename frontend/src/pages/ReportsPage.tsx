import React from 'react';
import { useData } from '../lib/useData';
import { demoReport } from '../lib/demo';
import type { ReportData } from '../lib/types';
import { fmtNum } from '../lib/status';
import { PageHead, Kpi, BarChart, StatBars, exportCsv } from '../components/ui';
import { IconDownload, IconFuel, IconChart, IconRoute } from '../components/Icons';

export const ReportsPage: React.FC = () => {
  const { data } = useData<ReportData>('/reports', demoReport);
  const r = data && (data as ReportData).monthly_revenue ? (data as ReportData) : demoReport;

  const costBars = r.costliest_vehicles.map((c, i) => ({ label: c.label, value: c.value, color: [ 'var(--red)', 'var(--amber)', 'var(--blue)' ][i] || 'var(--blue)' }));

  const exportReport = () => exportCsv('analytics.csv', [
    { metric: 'Fuel Efficiency (km/l)', value: r.fuel_efficiency_kmpl },
    { metric: 'Fleet Utilization (%)', value: r.fleet_utilization_pct },
    { metric: 'Operational Cost (₹)', value: r.operational_cost },
    { metric: 'Vehicle ROI (%)', value: r.vehicle_roi_pct },
    ...r.costliest_vehicles.map((c) => ({ metric: `Cost — ${c.label}`, value: c.value })),
  ]);

  return (
    <>
      <PageHead title="Reports & Analytics" sub="Efficiency, utilization & profitability">
        <button className="btn btn-ghost" onClick={exportReport}><IconDownload size={15} />CSV</button>
        <button className="btn btn-ghost" onClick={() => window.print()}><IconDownload size={15} />PDF</button>
      </PageHead>

      <div className="kpi-row mb-20">
        <Kpi label="Fuel Efficiency" value={`${r.fuel_efficiency_kmpl} km/l`} color="var(--blue)" icon={<IconFuel />} sub="Distance ÷ Fuel" tip="Total planned distance ÷ total fuel consumed." />
        <Kpi label="Fleet Utilization" value={`${r.fleet_utilization_pct}%`} color="var(--green)" icon={<IconChart />} sub="On-trip / active" tip="On Trip vehicles ÷ active vehicles." />
        <Kpi label="Operational Cost" value={`₹${fmtNum(r.operational_cost)}`} color="var(--amber)" icon={<IconRoute />} sub="Fuel + Maintenance" tip="Sum of fuel logs + maintenance costs." />
        <Kpi label="Vehicle ROI" value={`${r.vehicle_roi_pct}%`} color="var(--accent)" icon={<IconChart />} sub="Return on assets" tip="(Revenue − (Maintenance + Fuel)) ÷ Acquisition Cost." />
      </div>

      <div className="alert alert-info" style={{ fontFamily: 'var(--font-mono)' }}>ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost</div>

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
