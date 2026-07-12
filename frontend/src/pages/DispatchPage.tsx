import React, { useState } from 'react';
import client from '../api/client';
import { PageHead, Modal } from '../components/ui';
import { IconSearch, IconTruck, IconUsers, IconAlert } from '../components/Icons';
import type { DispatchRecommendation } from '../lib/types';
import { fmtNum } from '../lib/status';
import { useNavigate } from 'react-router-dom';

export const DispatchPage: React.FC = () => {
  const navigate = useNavigate();
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [cargoWeight, setCargoWeight] = useState(1000);
  const [plannedDistance, setPlannedDistance] = useState(100);
  const [preferredType, setPreferredType] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<DispatchRecommendation[]>([]);
  
  const [createModalData, setCreateModalData] = useState<DispatchRecommendation | null>(null);
  const [tripRevenue, setTripRevenue] = useState(0);

  const getRecommendations = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    setResults([]);
    try {
      const payload = {
        source,
        destination,
        cargo_weight_kg: cargoWeight,
        planned_distance_km: plannedDistance,
        preferred_vehicle_type: preferredType || null,
      };
      const res = await client.post('/dispatch/recommend', payload);
      setResults(res.data);
    } catch (e2: unknown) {
      const r = e2 as { response?: { data?: { detail?: string } } };
      setErr(r.response?.data?.detail || 'Failed to get recommendations.');
    } finally {
      setLoading(false);
    }
  };

  const createTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createModalData) return;
    try {
      await client.post('/trips', {
        source,
        destination,
        vehicle_id: createModalData.vehicle.id,
        driver_id: createModalData.driver.id,
        cargo_weight_kg: cargoWeight,
        planned_distance_km: plannedDistance,
        revenue: tripRevenue,
      });
      setCreateModalData(null);
      navigate('/trips');
    } catch (e2: unknown) {
      const r = e2 as { response?: { data?: { detail?: string } } };
      alert(r.response?.data?.detail || 'Failed to create trip');
    }
  };

  return (
    <>
      <PageHead title="AI Dispatcher" sub="Smart vehicle & driver recommendations based on availability, capacity, safety, and efficiency." />
      
      <div className="two-col" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="card card-pad">
          <div className="card-title mb-16">Trip Requirements</div>
          <form onSubmit={getRecommendations}>
            <div className="field">
              <label>Source</label>
              <input className="input" required value={source} onChange={e => setSource(e.target.value)} placeholder="Gandhinagar Depot" />
            </div>
            <div className="field">
              <label>Destination</label>
              <input className="input" required value={destination} onChange={e => setDestination(e.target.value)} placeholder="Ahmedabad Hub" />
            </div>
            <div className="field">
              <label>Cargo Weight (kg)</label>
              <input className="input" type="number" min={1} required value={cargoWeight || ''} onChange={e => setCargoWeight(+e.target.value)} />
            </div>
            <div className="field">
              <label>Planned Distance (km)</label>
              <input className="input" type="number" min={1} required value={plannedDistance || ''} onChange={e => setPlannedDistance(+e.target.value)} />
            </div>
            <div className="field mb-20">
              <label>Preferred Vehicle Type (Optional)</label>
              <select className="select" value={preferredType} onChange={e => setPreferredType(e.target.value)}>
                <option value="">Any</option>
                <option>Van</option>
                <option>Truck</option>
                <option>Mini</option>
              </select>
            </div>
            <button className="btn btn-primary btn-block" disabled={loading}>
              <IconSearch size={15}/> {loading ? 'Analyzing Fleet...' : 'Get Recommendations'}
            </button>
          </form>
          {err && <div className="alert alert-danger mt-16">{err}</div>}
        </div>
        
        <div>
          <div className="card-title mb-16">Ranked Recommendations</div>
          {results.length === 0 && !loading && !err && (
            <div className="card card-pad empty-row">
              Enter trip requirements and click "Get Recommendations" to see AI-ranked vehicle and driver pairings.
            </div>
          )}
          {loading && (
            <div className="card card-pad center-load" style={{ minHeight: '300px' }}>
              <div className="spinner" />
              <div className="text-muted mt-16">Evaluating availability, capacity, and efficiency metrics...</div>
            </div>
          )}
          <div className="grid">
            {results.map((rec) => (
              <div key={rec.rank} className="card card-pad" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ flexShrink: 0, textAlign: 'center', width: '60px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: rec.rank === 1 ? 'var(--accent)' : 'var(--text-muted)' }}>#{rec.rank}</div>
                  <div className="badge b-green mt-8">{rec.total_score}% Score</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                    <div>
                      <div className="text-faint" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vehicle</div>
                      <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}><IconTruck size={14} className="text-muted"/> {rec.vehicle.registration_number}</div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>{rec.vehicle.name_model} · {fmtNum(rec.vehicle.max_load_capacity_kg)}kg cap</div>
                    </div>
                    <div>
                      <div className="text-faint" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Driver</div>
                      <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}><IconUsers size={14} className="text-muted"/> {rec.driver.name}</div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>{rec.driver.safety_score}/100 Safety · {rec.driver.experience_years || 0}y exp</div>
                    </div>
                  </div>
                  <div className="view-note" style={{ margin: 0 }}>
                    <IconAlert size={15}/> {rec.reasoning}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <button className="btn btn-ghost" onClick={() => setCreateModalData(rec)}>Create Trip</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {createModalData && (
        <Modal title="Create Trip from Recommendation" onClose={() => setCreateModalData(null)} footer={<><button className="btn btn-ghost" onClick={() => setCreateModalData(null)}>Cancel</button><button className="btn btn-primary" form="create-trip-form">Create Draft Trip</button></>}>
          <form id="create-trip-form" onSubmit={createTrip}>
            <div className="valid-block valid-ok mb-16">
              <div className="vline"><span>Source</span> <span>{source}</span></div>
              <div className="vline"><span>Destination</span> <span>{destination}</span></div>
              <div className="vline"><span>Cargo Weight</span> <span>{cargoWeight} kg</span></div>
              <div className="vline"><span>Vehicle</span> <span>{createModalData.vehicle.registration_number}</span></div>
              <div className="vline"><span>Driver</span> <span>{createModalData.driver.name}</span></div>
            </div>
            <div className="field">
              <label>Expected Revenue (₹)</label>
              <input className="input" type="number" min={0} value={tripRevenue} onChange={e => setTripRevenue(+e.target.value)} />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};
export default DispatchPage;
