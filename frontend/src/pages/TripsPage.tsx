import React, { useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../lib/useData';
import { demoTrips, demoVehicles, demoDrivers } from '../lib/demo';
import type { Trip, Vehicle, Driver } from '../lib/types';
import { canEdit, roleLabel } from '../lib/roles';
import { expiryInfo } from '../lib/status';
import { logActivity } from '../lib/activity';
import { PageHead, Badge, Modal, exportCsv, CustomSelect } from '../components/ui';
import { IconAlert, IconCheck, IconMap, IconClock, IconDownload } from '../components/Icons';

const LIFECYCLE = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

export const TripsPage: React.FC = () => {
  const { user } = useAuth();
  const editable = canEdit(user?.role, 'trips');

  const { data: trips, setData: setTrips } = useData<Trip[]>('/trips', demoTrips);
  const { data: vehicles, setData: setVehicles } = useData<Vehicle[]>('/vehicles', demoVehicles);
  const { data: drivers, setData: setDrivers } = useData<Driver[]>('/drivers', demoDrivers);
  const tripRows = Array.isArray(trips) ? trips : demoTrips;
  const vehRows = Array.isArray(vehicles) ? vehicles : demoVehicles;
  const drvRows = Array.isArray(drivers) ? drivers : demoDrivers;

  // Dispatch-eligible pools (business rules): vehicles Available only; drivers Available + not expired
  const availVehicles = vehRows.filter((v) => v.status === 'Available');
  const availDrivers = drvRows.filter((d) => d.status === 'Available' && !expiryInfo(d.license_expiry).expired);

  const [source, setSource] = useState('');
  const [dest, setDest] = useState('');
  const [vehId, setVehId] = useState('');
  const [drvId, setDrvId] = useState('');
  const [cargo, setCargo] = useState<number>(0);
  const [dist, setDist] = useState<number>(0);
  const [completing, setCompleting] = useState<Trip | null>(null);
  const [finalOdo, setFinalOdo] = useState<number>(0);
  const [fuel, setFuel] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);

  const veh = vehRows.find((v) => v.id === vehId);
  const drv = drvRows.find((d) => d.id === drvId);
  const cap = veh?.max_load_capacity_kg ?? 0;
  const over = veh ? cargo - cap : 0;
  const capOk = veh ? cargo <= cap && cargo > 0 : false;
  const canDispatch = editable && !!source && !!dest && !!veh && !!drv && capOk;
  const gaugePct = cap ? Math.min((cargo / cap) * 100, 100) : 0;
  const gaugeColor = over > 0 ? 'var(--red)' : gaugePct > 85 ? 'var(--amber)' : 'var(--green)';

  const reset = () => { setSource(''); setDest(''); setVehId(''); setDrvId(''); setCargo(0); setDist(0); };

  const dispatch = async () => {
    if (!canDispatch || !veh || !drv) return;
    const code = `TR${String(tripRows.length + 1).padStart(3, '0')}`;
    const trip: Trip = { id: `t${Date.now()}`, code, source, destination: dest, vehicle_id: veh.id, vehicle_label: veh.registration_number, driver_id: drv.id, driver_label: drv.name, cargo_weight_kg: cargo, planned_distance_km: dist, status: 'Dispatched', eta: `${Math.round(dist * 2)} min` };
    // cascade: vehicle + driver -> On Trip
    setTrips([trip, ...tripRows]);
    setVehicles(vehRows.map((v) => (v.id === veh.id ? { ...v, status: 'On Trip' } : v)));
    setDrivers(drvRows.map((d) => (d.id === drv.id ? { ...d, status: 'On Trip' } : d)));
    reset();
    logActivity({ actor: user?.name || 'Unknown', role: roleLabel(user?.role), entity: 'Trip', entityLabel: code, action: 'Dispatched', detail: `${veh.registration_number} & ${drv.name} → On Trip` });
    try { await client.post('/trips', { source, destination: dest, vehicle_id: veh.id, driver_id: drv.id, cargo_weight_kg: cargo, planned_distance_km: dist, dispatch: true }); } catch { /* offline demo */ }
  };

  const cancelTrip = async (t: Trip) => {
    setTrips(tripRows.map((x) => (x.id === t.id ? { ...x, status: 'Cancelled' } : x)));
    setVehicles(vehRows.map((v) => (v.registration_number === t.vehicle_label ? { ...v, status: 'Available' } : v)));
    setDrivers(drvRows.map((d) => (d.name === t.driver_label ? { ...d, status: 'Available' } : d)));
    logActivity({ actor: user?.name || 'Unknown', role: roleLabel(user?.role), entity: 'Trip', entityLabel: t.code || t.id, action: 'Cancelled', detail: `${t.vehicle_label} & ${t.driver_label} restored to Available` });
    try { await client.post(`/trips/${t.id}/cancel`); } catch { /* offline demo */ }
  };

  const completeTrip = async () => {
    if (!completing) return;
    const t = completing;
    // cascade: odometer -> fuel log -> expense -> vehicle & driver Available -> Completed
    setTrips(tripRows.map((x) => (x.id === t.id ? { ...x, status: 'Completed', final_odometer: finalOdo, fuel_consumed: fuel, revenue, eta: null } : x)));
    setVehicles(vehRows.map((v) => (v.registration_number === t.vehicle_label ? { ...v, status: 'Available', odometer_km: finalOdo || v.odometer_km } : v)));
    setDrivers(drvRows.map((d) => (d.name === t.driver_label ? { ...d, status: 'Available' } : d)));
    setCompleting(null); setFinalOdo(0); setFuel(0); setRevenue(0);
    logActivity({ actor: user?.name || 'Unknown', role: roleLabel(user?.role), entity: 'Trip', entityLabel: t.code || t.id, action: 'Completed', detail: `Odometer ${finalOdo}km, fuel ${fuel}L, revenue ₹${revenue} logged; ${t.vehicle_label} & ${t.driver_label} → Available` });
    try { await client.post(`/trips/${t.id}/complete`, { final_odometer: finalOdo, fuel_consumed: fuel, revenue }); } catch { /* offline demo */ }
  };

  return (
    <>
      <PageHead title="Trip Dispatcher" sub="Create, dispatch and monitor trips">
        <button className="btn btn-ghost" onClick={() => exportCsv('trips.csv', tripRows as unknown as Record<string, unknown>[])}><IconDownload size={15} />CSV</button>
      </PageHead>

      {!editable && <div className="view-note"><IconAlert size={15} />You have view access to Trips — contact a Dispatcher to modify.</div>}

      <div className="two-col">
        {/* LEFT: lifecycle + create form */}
        <div>
          <div className="card card-pad mb-16">
            <div className="klabel mb-16">Trip Lifecycle</div>
            <div className="stepper">
              {LIFECYCLE.map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`step ${i === 0 ? 'done' : i === 1 ? 'current' : ''}`}>
                    <span className="step-dot">{i === 0 ? <IconCheck size={12} /> : i + 1}</span>
                    <span className="step-label">{s}</span>
                  </div>
                  {i < LIFECYCLE.length - 1 && <span className={`step-line ${i === 0 ? 'done' : ''}`} />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <div className="card-title mb-20">Create Trip</div>
            <div className="field-row">
              <div className="field"><label>Source</label><input className="input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Gandhinagar Depot" disabled={!editable} /></div>
              <div className="field"><label>Destination</label><input className="input" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Ahmedabad Hub" disabled={!editable} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Vehicle (Available only)</label>
                <CustomSelect 
                  value={vehId} 
                  onChange={setVehId} 
                  options={[{ value: '', label: 'Select vehicle…' }, ...availVehicles.map(v => ({ value: v.id, label: `${v.registration_number} · ${v.max_load_capacity_kg}kg` }))]}
                  placeholder="Select vehicle…"
                  disabled={!editable}
                />
              </div>
              <div className="field"><label>Driver (Available only)</label>
                <CustomSelect 
                  value={drvId} 
                  onChange={setDrvId} 
                  options={[{ value: '', label: 'Select driver…' }, ...availDrivers.map(d => ({ value: d.id, label: `${d.name} · safety ${d.safety_score}` }))]}
                  placeholder="Select driver…"
                  disabled={!editable}
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Cargo Weight (kg)</label><input className="input" type="number" min={0} value={cargo || ''} onChange={(e) => setCargo(+e.target.value)} placeholder="450" disabled={!editable} /></div>
              <div className="field"><label>Planned Distance (km)</label><input className="input" type="number" min={0} value={dist || ''} onChange={(e) => setDist(+e.target.value)} placeholder="32" disabled={!editable} /></div>
            </div>

            {/* Live capacity validation block + gauge */}
            {veh && cargo > 0 && (
              <div className={`valid-block ${capOk ? 'valid-ok' : 'valid-err'}`}>
                <div className="vline"><span>Vehicle Capacity</span><b>{cap} kg</b></div>
                <div className="vline"><span>Cargo Weight</span><b>{cargo} kg</b></div>
                <div className="gauge"><div className="gauge-fill" style={{ width: `${gaugePct}%`, background: gaugeColor }} /></div>
                <div className="vresult">
                  {capOk
                    ? <><IconCheck size={14} />Within capacity — dispatch allowed{drv && <span className="text-muted" style={{ fontWeight: 400 }}> · {veh.registration_number} → On Trip, {drv.name} → On Trip</span>}</>
                    : <><IconAlert size={14} />Capacity exceeded by {over} kg — dispatch blocked</>}
                </div>
              </div>
            )}

            <div className="flex gap-12 mt-8">
              <button className="btn btn-primary" disabled={!canDispatch} onClick={dispatch}>Dispatch Trip</button>
              <button className="btn btn-ghost" onClick={reset}>Cancel</button>
            </div>
          </div>
        </div>

        {/* RIGHT: live board */}
        <div className="card card-pad">
          <div className="card-title mb-20">Live Board</div>
          {tripRows.map((t) => (
            <div className="live-card" key={t.id}>
              <div className="live-top">
                <span className="live-id">{t.code || t.id}</span>
                <span className="live-meta">{t.vehicle_label || 'Unassigned'}{t.driver_label ? ` · ${t.driver_label}` : ''}</span>
              </div>
              <div className="live-route"><IconMap size={13} style={{ verticalAlign: -2, marginRight: 6, opacity: 0.6 }} />{t.source} → {t.destination}</div>
              <div className="live-foot">
                <Badge status={t.status} />
                <span className="live-meta">{t.eta ? <><IconClock size={12} style={{ verticalAlign: -2 }} /> {t.eta}</> : (t.note || '—')}</span>
              </div>
              {editable && t.status === 'Dispatched' && (
                <div className="flex gap-8 mt-8">
                  <button className="btn btn-success btn-sm" onClick={() => { setCompleting(t); setFinalOdo(0); setFuel(0); }}>Complete</button>
                  <button className="btn btn-danger btn-sm" onClick={() => cancelTrip(t)}>Cancel Trip</button>
                </div>
              )}
            </div>
          ))}
          <div className="rule-note" style={{ marginTop: 16 }}><IconAlert size={14} />On Complete: odometer → fuel log → expense → Vehicle &amp; Driver set Available.</div>
        </div>
      </div>

      {completing && (
        <Modal title={`Complete Trip ${completing.code}`} onClose={() => setCompleting(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setCompleting(null)}>Cancel</button><button className="btn btn-success" onClick={completeTrip} disabled={!finalOdo || !fuel}>Complete &amp; Cascade</button></>}>
          <p className="text-muted mb-16" style={{ fontSize: 13 }}>{completing.vehicle_label} · {completing.driver_label} · {completing.source} → {completing.destination}</p>
          <div className="field-row">
            <div className="field"><label>Final Odometer (km)</label><input className="input" type="number" min={0} value={finalOdo || ''} onChange={(e) => setFinalOdo(+e.target.value)} placeholder="74032" /></div>
            <div className="field"><label>Fuel Consumed (L)</label><input className="input" type="number" min={0} value={fuel || ''} onChange={(e) => setFuel(+e.target.value)} placeholder="42" /></div>
          </div>
          <div className="field"><label>Revenue for this trip (₹)</label><input className="input" type="number" min={0} value={revenue || ''} onChange={(e) => setRevenue(+e.target.value)} placeholder="42000" /></div>
          <div className="alert alert-info"><IconCheck size={14} style={{ verticalAlign: -2, marginRight: 6 }} />On submit: vehicle odometer updates, a fuel log &amp; expense entry are created, vehicle + driver return to Available, and revenue feeds Vehicle ROI on Analytics.</div>
        </Modal>
      )}
    </>
  );
};
export default TripsPage;
