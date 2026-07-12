import React, { useState } from 'react';
import { PageHead, Loader } from '../components/ui';
import { useData } from '../lib/useData';
import type { MapVehicle } from '../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create colored marker icons dynamically based on status
const createIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const iconAvailable = createIcon('#22c55e'); // Green
const iconOnTrip = createIcon('#3b82f6');    // Blue
const iconInShop = createIcon('#f59e0b');    // Amber
const iconRetired = createIcon('#ef4444');   // Red

const getIcon = (status: string) => {
  switch (status) {
    case 'Available': return iconAvailable;
    case 'On Trip': return iconOnTrip;
    case 'In Shop': return iconInShop;
    default: return iconRetired;
  }
};

const VEH_TYPES = ['Van', 'Truck', 'Mini'];
const VEH_STATUSES = ['Available', 'On Trip', 'In Shop'];

export const MapPage: React.FC = () => {
  const [statusF, setStatusF] = useState('');
  const [type, setType] = useState('');

  const params: Record<string, unknown> = {};
  if (statusF) params.status = statusF;
  if (type) params.type = type;

  // Real backend endpoint with an empty array fallback if backend isn't ready
  const { data, loading, error } = useData<MapVehicle[]>('/map/vehicles');
  const vehicles = data ?? [];

  return (
    <>
      <PageHead title="Fleet Map" sub="Live location tracking and status visualization">
        <div className="filters" style={{ marginBottom: 0 }}>
          <div className="filter-group"><label>Status</label><select className="select" value={statusF} onChange={(e) => setStatusF(e.target.value)}><option value="">All</option>{VEH_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
          <div className="filter-group"><label>Type</label><select className="select" value={type} onChange={(e) => setType(e.target.value)}><option value="">All</option>{VEH_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
        </div>
      </PageHead>

      {loading ? <Loader /> : error ? <div className="alert alert-danger">{error}</div> : (
        <div className="card" style={{ height: 'calc(100vh - 120px)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <MapContainer center={[22.2587, 71.1924]} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {vehicles.map((v) => {
              if (v.latitude == null || v.longitude == null) return null;
              return (
                <Marker key={v.id} position={[v.latitude, v.longitude]} icon={getIcon(v.status)}>
                  <Popup>
                    <div style={{ padding: '4px', minWidth: '150px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{v.registration_number}</div>
                      <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>{v.name_model} ({v.type})</div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span className={`badge ${v.status === 'Available' ? 'b-green' : v.status === 'On Trip' ? 'b-blue' : 'b-amber'}`}>
                          <span className="dot"/> {v.status}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '12px' }}>
                        <strong>Driver:</strong> {v.driver_name || 'Unassigned'}
                      </div>
                      {v.last_location_update && (
                        <div style={{ fontSize: '10px', color: '#888', marginTop: '8px' }}>
                          Updated: {new Date(v.last_location_update).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
          
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000, background: 'var(--surface)', padding: '12px 16px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '8px' }}>Legend</div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }}/> Available</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}/> On Trip</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}/> In Shop</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default MapPage;
