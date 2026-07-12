import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../lib/useData';
import { PageHead, Badge, Loader, Modal } from '../components/ui';
import { IconArrowLeft, IconFile, IconUpload, IconCalendar, IconAlert, IconWrench, IconFuel, IconRoute, IconSettings } from '../components/Icons';
import { fmtNum } from '../lib/status';

interface ComplianceEvent {
  timestamp: string;
  event: string;
  status_before: string;
  status_after: string;
}

interface PassportTrip {
  id: string;
  source: string;
  destination: string;
  distance_km: number;
  revenue: number;
  status: string;
  completed_at: string | null;
}

interface PassportMaint {
  id: string;
  service_type: string;
  cost: number;
  opened_at: string;
  closed_at: string | null;
  status: string;
}

interface PassportFuel {
  id: string;
  liters: number;
  cost: number;
  date: string;
  odometer_km: number | null;
}

interface PassportExpense {
  id: string;
  category: string;
  amount: number;
  date: string;
  notes: string | null;
}

interface PassportStats {
  total_trips: number;
  total_revenue: number;
  total_maintenance_cost: number;
  total_fuel_cost: number;
  total_expenses: number;
  total_operational_cost: number;
  average_fuel_efficiency_km_per_liter: number | null;
}

interface VehicleProfile {
  id: string;
  registration_number: string;
  name_model: string;
  type: string;
  max_load_capacity_kg: number;
  odometer_km: number;
  acquisition_cost: number;
  status: string;
  region: string | null;
  created_at: string;
  documents: { id: string; label: string; filename: string; dataUrl: string; uploaded_at: string; }[];
  insurance_expiry: string | null;
  rc_expiry: string | null;
  puc_expiry: string | null;
  fitness_expiry: string | null;
}

interface PassportData {
  vehicle: VehicleProfile;
  trip_history: PassportTrip[];
  maintenance_history: PassportMaint[];
  fuel_logs: PassportFuel[];
  expenses: PassportExpense[];
  compliance_timeline: ComplianceEvent[];
  summary: PassportStats;
}

export const PassportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isManager = user?.role === 'fleet_manager';

  const { data, loading, live, reload } = useData<PassportData>(`/vehicles/${id}/passport`, null as any);
  const [activeTab, setActiveTab] = useState<'timeline' | 'trips' | 'maint' | 'fuel' | 'expenses'>('timeline');
  const [updatingExpiries, setUpdatingExpiries] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Expiry dates form state
  const [expForm, setExpForm] = useState({
    insurance_expiry: '',
    rc_expiry: '',
    puc_expiry: '',
    fitness_expiry: '',
  });

  const openExpiryModal = () => {
    if (!data?.vehicle) return;
    setExpForm({
      insurance_expiry: data.vehicle.insurance_expiry || '',
      rc_expiry: data.vehicle.rc_expiry || '',
      puc_expiry: data.vehicle.puc_expiry || '',
      fitness_expiry: data.vehicle.fitness_expiry || '',
    });
    setUpdatingExpiries(true);
    setSaveErr(null);
  };

  const saveExpiries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !data?.vehicle) return;
    setSaveErr(null);
    try {
      await client.put(`/vehicles/${id}`, {
        ...data.vehicle,
        insurance_expiry: expForm.insurance_expiry || null,
        rc_expiry: expForm.rc_expiry || null,
        puc_expiry: expForm.puc_expiry || null,
        fitness_expiry: expForm.fitness_expiry || null,
      });
      setUpdatingExpiries(false);
      reload();
    } catch (err: any) {
      setSaveErr(err.response?.data?.detail || 'Failed to update expiry dates.');
    }
  };

  const handleDocUpload = async (label: 'RC' | 'Insurance' | 'PUC' | 'Fitness Document', file: File) => {
    if (!id || !data?.vehicle) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const doc = {
          id: `doc_${label.toLowerCase()}_${Date.now()}`,
          label,
          filename: file.name,
          dataUrl: String(reader.result),
          uploaded_at: new Date().toISOString(),
        };
        const updatedDocs = [
          ...(data.vehicle.documents || []).filter((d) => d.label !== label),
          doc,
        ];
        await client.put(`/vehicles/${id}`, {
          ...data.vehicle,
          documents: updatedDocs,
        });
        reload();
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to upload document.');
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <Loader />;
  if (!live || !data) {
    return (
      <div className="card card-pad text-center">
        <IconAlert size={40} style={{ color: 'var(--red)', marginBottom: 16 }} />
        <h3>Vehicle Passport Not Found</h3>
        <p className="text-muted">The requested vehicle record could not be loaded.</p>
        <button className="btn btn-ghost mt-16" onClick={() => navigate(-1)}><IconArrowLeft size={15} /> Go Back</button>
      </div>
    );
  }

  const { vehicle, trip_history, maintenance_history, fuel_logs, expenses, compliance_timeline, summary } = data;

  // Expiry helper
  const getExpiryBadge = (dateStr: string | null) => {
    if (!dateStr) return <span className="badge b-gray">Not Set</span>;
    const expDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="badge b-red">Expired ({Math.abs(diffDays)} days ago)</span>;
    } else if (diffDays <= 30) {
      return <span className="badge b-amber">Expiring soon ({diffDays} days left)</span>;
    } else {
      return <span className="badge b-green">Valid ({diffDays} days left)</span>;
    }
  };

  return (
    <>
      <PageHead title={`Digital Passport: ${vehicle.registration_number}`} sub={`${vehicle.name_model} · ${vehicle.region || 'No Region'}`}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}><IconArrowLeft size={15} />Back</button>
        {isManager && <button className="btn btn-primary" onClick={openExpiryModal}><IconSettings size={15} />Manage Expiries</button>}
      </PageHead>

      <div className="two-col" style={{ gap: 20 }}>
        {/* Left Column: Vehicle Profile & Expiry Checklists */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Profile Card */}
          <div className="card card-pad">
            <h3 style={{ marginBottom: 16 }}>Vehicle Profile</h3>
            <div className="flex gap-8" style={{ marginBottom: 20 }}>
              <Badge status={vehicle.status} />
              <span className="badge b-blue">{vehicle.type}</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
              <div>
                <label className="text-faint" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase' }}>Odometer</label>
                <strong style={{ fontSize: 16 }}>{fmtNum(vehicle.odometer_km)} km</strong>
              </div>
              <div>
                <label className="text-faint" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase' }}>Max Load Capacity</label>
                <strong style={{ fontSize: 16 }}>{fmtNum(vehicle.max_load_capacity_kg)} kg</strong>
              </div>
              <div>
                <label className="text-faint" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase' }}>Acquisition Cost</label>
                <strong style={{ fontSize: 16 }}>₹{fmtNum(vehicle.acquisition_cost)}</strong>
              </div>
              <div>
                <label className="text-faint" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase' }}>Region</label>
                <strong style={{ fontSize: 16 }}>{vehicle.region || '—'}</strong>
              </div>
            </div>
          </div>

          {/* Expiry Reminders & Documents */}
          <div className="card card-pad">
            <h3 style={{ marginBottom: 16 }}>Compliance Documents & Expiries</h3>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>Status / Expiry</th>
                  {isManager && <th style={{ textAlign: 'right' }}>Upload / Replace</th>}
                </tr>
              </thead>
              <tbody>
                {([
                  { key: 'insurance_expiry', label: 'Insurance' },
                  { key: 'rc_expiry', label: 'RC' },
                  { key: 'puc_expiry', label: 'PUC' },
                  { key: 'fitness_expiry', label: 'Fitness Document' },
                ] as const).map((doc) => {
                  const existingDoc = (vehicle.documents || []).find((d) => d.label === doc.label);
                  return (
                    <tr key={doc.key}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>{doc.label}</strong>
                          {existingDoc ? (
                            <a href={existingDoc.dataUrl} download={existingDoc.filename} className="link" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <IconFile size={11} /> {existingDoc.filename}
                            </a>
                          ) : (
                            <span className="text-faint" style={{ fontSize: 11 }}>No document file uploaded</span>
                          )}
                        </div>
                      </td>
                      <td>{getExpiryBadge(vehicle[doc.key])}</td>
                      {isManager && (
                        <td style={{ textAlign: 'right' }}>
                          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', padding: '4px 8px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <IconUpload size={12} /> Upload
                            <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleDocUpload(doc.label, file);
                            }} />
                          </label>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Operational Metrics Summary */}
          <div className="card card-pad">
            <h3 style={{ marginBottom: 16 }}>Financial & Operational Stats</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
              <div>
                <label className="text-faint" style={{ fontSize: 11, display: 'block' }}>Total Completed Trips</label>
                <strong style={{ fontSize: 18, color: 'var(--blue)' }}>{summary.total_trips}</strong>
              </div>
              <div>
                <label className="text-faint" style={{ fontSize: 11, display: 'block' }}>Total Revenue Earned</label>
                <strong style={{ fontSize: 18, color: 'var(--green)' }}>₹{fmtNum(summary.total_revenue)}</strong>
              </div>
              <div>
                <label className="text-faint" style={{ fontSize: 11, display: 'block' }}>Total Operational Cost</label>
                <strong style={{ fontSize: 18, color: 'var(--red)' }}>₹{fmtNum(summary.total_operational_cost)}</strong>
              </div>
              <div>
                <label className="text-faint" style={{ fontSize: 11, display: 'block' }}>Fuel Efficiency</label>
                <strong style={{ fontSize: 18 }}>{summary.average_fuel_efficiency_km_per_liter ? `${summary.average_fuel_efficiency_km_per_liter.toFixed(2)} km/L` : '—'}</strong>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Interactive History Logs */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-head" style={{ padding: '8px 16px', display: 'flex', gap: 8, borderBottom: '1px solid var(--border)' }}>
              <button className={`btn ${activeTab === 'timeline' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('timeline')}><IconCalendar size={13} /> Timeline</button>
              <button className={`btn ${activeTab === 'trips' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('trips')}><IconRoute size={13} /> Trips ({trip_history.length})</button>
              <button className={`btn ${activeTab === 'maint' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('maint')}><IconWrench size={13} /> Maintenance ({maintenance_history.length})</button>
              <button className={`btn ${activeTab === 'fuel' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('fuel')}><IconFuel size={13} /> Fuel ({fuel_logs.length})</button>
              <button className={`btn ${activeTab === 'expenses' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('expenses')}><IconFile size={13} /> Expenses ({expenses.length})</button>
            </div>

            <div style={{ padding: 16, minHeight: 300, maxHeight: 600, overflowY: 'auto' }}>
              {/* Compliance Timeline Tab */}
              {activeTab === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {compliance_timeline.length === 0 && <p className="text-center text-muted">No timeline history recorded.</p>}
                  {compliance_timeline.map((event, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, borderLeft: '2px solid var(--border)', paddingLeft: 16, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: -5, top: 4, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(event.timestamp).toLocaleString()}</div>
                        <div style={{ fontWeight: 'bold', marginTop: 4 }}>{event.event}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                          Status: <span style={{ textDecoration: 'line-through' }}>{event.status_before}</span> → <strong>{event.status_after}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Trip History Tab */}
              {activeTab === 'trips' && (
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Distance</th>
                      <th>Revenue</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trip_history.map((t) => (
                      <tr key={t.id}>
                        <td><strong>{t.source}</strong> to <strong>{t.destination}</strong></td>
                        <td>{t.distance_km} km</td>
                        <td>₹{fmtNum(t.revenue)}</td>
                        <td><span className={`badge b-${t.status === 'Completed' ? 'green' : 'amber'}`}>{t.status}</span></td>
                      </tr>
                    ))}
                    {trip_history.length === 0 && <tr><td colSpan={4} className="text-center text-muted">No trip history recorded.</td></tr>}
                  </tbody>
                </table>
              )}

              {/* Maintenance History Tab */}
              {activeTab === 'maint' && (
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Service Type</th>
                      <th>Date</th>
                      <th>Cost</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenance_history.map((m) => (
                      <tr key={m.id}>
                        <td><strong>{m.service_type}</strong></td>
                        <td>{new Date(m.opened_at).toLocaleDateString()}</td>
                        <td>₹{fmtNum(m.cost)}</td>
                        <td><span className={`badge b-${m.status === 'Closed' ? 'green' : 'amber'}`}>{m.status}</span></td>
                      </tr>
                    ))}
                    {maintenance_history.length === 0 && <tr><td colSpan={4} className="text-center text-muted">No maintenance history recorded.</td></tr>}
                  </tbody>
                </table>
              )}

              {/* Fuel Logs Tab */}
              {activeTab === 'fuel' && (
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Liters</th>
                      <th>Cost</th>
                      <th>Odometer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fuel_logs.map((f) => (
                      <tr key={f.id}>
                        <td>{new Date(f.date).toLocaleDateString()}</td>
                        <td>{f.liters} L</td>
                        <td>₹{fmtNum(f.cost)}</td>
                        <td>{f.odometer_km ? `${fmtNum(f.odometer_km)} km` : '—'}</td>
                      </tr>
                    ))}
                    {fuel_logs.length === 0 && <tr><td colSpan={4} className="text-center text-muted">No fuel logs found.</td></tr>}
                  </tbody>
                </table>
              )}

              {/* Expenses Tab */}
              {activeTab === 'expenses' && (
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id}>
                        <td>{new Date(e.date).toLocaleDateString()}</td>
                        <td><span className="badge b-gray">{e.category}</span></td>
                        <td>₹{fmtNum(e.amount)}</td>
                        <td className="text-muted" style={{ fontSize: 12 }}>{e.notes || '—'}</td>
                      </tr>
                    ))}
                    {expenses.length === 0 && <tr><td colSpan={4} className="text-center text-muted">No expenses recorded.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Expiry Modal */}
      {updatingExpiries && (
        <Modal title="Manage Document Expiry Dates" onClose={() => setUpdatingExpiries(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setUpdatingExpiries(false)}>Cancel</button><button className="btn btn-primary" form="exp-form">Save Changes</button></>}>
          <form id="exp-form" onSubmit={saveExpiries}>
            {saveErr && <div className="alert alert-danger">{saveErr}</div>}
            <div className="field">
              <label>Insurance Expiry Date</label>
              <input className="input" type="date" value={expForm.insurance_expiry} onChange={(e) => setExpForm({ ...expForm, insurance_expiry: e.target.value })} />
            </div>
            <div className="field">
              <label>RC Expiry Date</label>
              <input className="input" type="date" value={expForm.rc_expiry} onChange={(e) => setExpForm({ ...expForm, rc_expiry: e.target.value })} />
            </div>
            <div className="field">
              <label>PUC Expiry Date</label>
              <input className="input" type="date" value={expForm.puc_expiry} onChange={(e) => setExpForm({ ...expForm, puc_expiry: e.target.value })} />
            </div>
            <div className="field">
              <label>Fitness Document Expiry Date</label>
              <input className="input" type="date" value={expForm.fitness_expiry} onChange={(e) => setExpForm({ ...expForm, fitness_expiry: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

export default PassportPage;
