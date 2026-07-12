import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

interface FuelLog {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  liters: number;
  cost: number;
  date: string;
  odometer_km: number | null;
}

interface Expense {
  id: string;
  vehicle_id: string;
  category: string;
  amount: number;
  date: string;
  notes: string | null;
}

interface Vehicle {
  id: string;
  registration_number: string;
  name_model: string;
}

export const FuelExpensePage: React.FC = () => {
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { hasRole } = useAuth();
  const isManager = hasRole(['fleet_manager']);
  const isFinance = hasRole(['financial_analyst']);
  const isDriver = hasRole(['driver']);

  const canLogFuel = isManager || isFinance || isDriver;
  const canLogExpense = isManager || isFinance;

  // Active tab state
  const [activeTab, setActiveTab] = useState<'fuel' | 'expenses'>('fuel');

  // Modals state
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Fuel Form Fields
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [tripId, setTripId] = useState('');
  const [liters, setLiters] = useState(0);
  const [cost, setCost] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState<string>('');
  
  // Expense Form Fields
  const [expCategory, setExpCategory] = useState('Toll');
  const [expAmount, setExpAmount] = useState(0);
  const [expNotes, setExpNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchFuel = async () => {
    try {
      const res = await client.get('/fuel-expense/fuel');
      setFuelLogs(res.data);
    } catch (e) {
      // Ignore
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await client.get('/fuel-expense/expenses');
      setExpenses(res.data);
    } catch (e) {
      // Ignore
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await client.get('/vehicles');
      setVehicles(res.data);
    } catch (e) {
      // Ignore
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchFuel(), fetchExpenses(), fetchVehicles()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openFuel = () => {
    setSelectedVehicle('');
    setTripId('');
    setLiters(0);
    setCost(0);
    setDate(new Date().toISOString().split('T')[0]);
    setOdometer('');
    setFormError(null);
    setShowFuelModal(true);
  };

  const openExpense = () => {
    setSelectedVehicle('');
    setExpCategory('Toll');
    setExpAmount(0);
    setExpNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setFormError(null);
    setShowExpenseModal(true);
  };

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      vehicle_id: selectedVehicle,
      trip_id: tripId || null,
      liters,
      cost,
      date,
      odometer_km: odometer ? Number(odometer) : null,
    };

    try {
      await client.post('/fuel-expense/fuel', payload);
      setShowFuelModal(false);
      fetchFuel();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to submit fuel log.');
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      vehicle_id: selectedVehicle,
      category: expCategory,
      amount: expAmount,
      date,
      notes: expNotes || null,
    };

    try {
      await client.post('/fuel-expense/expenses', payload);
      setShowExpenseModal(false);
      fetchExpenses();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to record expense.');
    }
  };

  return (
    <div className="container">
      {/* Tabs selector */}
      <div className="tabs" style={{ marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('fuel')}
          className={`btn ${activeTab === 'fuel' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ marginRight: '10px' }}
        >
          Fuel Logs
        </button>
        {canLogExpense && (
          <button
            onClick={() => setActiveTab('expenses')}
            className={`btn ${activeTab === 'expenses' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Expenses Registry
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <h2>{activeTab === 'fuel' ? 'Fuel Purchases Log' : 'Operational Expenses'}</h2>
        {activeTab === 'fuel' && canLogFuel && (
          <button onClick={openFuel} className="btn btn-primary">
            + Log Fuel Purchase
          </button>
        )}
        {activeTab === 'expenses' && canLogExpense && (
          <button onClick={openExpense} className="btn btn-primary">
            + Record Expense
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading records...</p>
      ) : (
        <div className="card">
          {activeTab === 'fuel' ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Fuel Liters</th>
                  <th>Fuel Cost</th>
                  <th>Date</th>
                  <th>Odometer Reading</th>
                  <th>Associated Trip ID</th>
                </tr>
              </thead>
              <tbody>
                {fuelLogs.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 'bold' }}>
                      {vehicles.find(v => v.id === f.vehicle_id)?.registration_number || f.vehicle_id.slice(0, 8)}
                    </td>
                    <td>{f.liters} liters</td>
                    <td>${f.cost.toLocaleString()}</td>
                    <td>{f.date}</td>
                    <td>{f.odometer_km ? `${f.odometer_km.toLocaleString()} km` : '—'}</td>
                    <td>{f.trip_id ? f.trip_id.slice(0, 8) : '—'}</td>
                  </tr>
                ))}
                {fuelLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center' }} className="text-muted">
                      No fuel logs recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 'bold' }}>
                      {vehicles.find(v => v.id === e.vehicle_id)?.registration_number || e.vehicle_id.slice(0, 8)}
                    </td>
                    <td>
                      <span className="role-badge" style={{ backgroundColor: '#eaeaea', color: '#333' }}>
                        {e.category}
                      </span>
                    </td>
                    <td>${e.amount.toLocaleString()}</td>
                    <td>{e.date}</td>
                    <td className="text-muted">{e.notes || '—'}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center' }} className="text-muted">
                      No expenses logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Fuel Log Modal */}
      {showFuelModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Log Fuel Purchase</h3>
            {formError && <div className="alert alert-danger">{formError}</div>}

            <form onSubmit={handleFuelSubmit}>
              <div className="form-group">
                <label>Select Vehicle</label>
                <select
                  className="form-control"
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  required
                >
                  <option value="">Choose Vehicle...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.name_model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Associated Trip ID (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                  placeholder="UUID of the trip"
                />
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Fuel filled (liters)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={liters}
                    onChange={(e) => setLiters(Number(e.target.value))}
                    required
                    min={0.1}
                    step="any"
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Cost ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    required
                    min={0.01}
                    step="any"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Odometer at fill (km - Optional)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    min={0}
                    step="any"
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowFuelModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Log Fuel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Record Operational Expense</h3>
            {formError && <div className="alert alert-danger">{formError}</div>}

            <form onSubmit={handleExpenseSubmit}>
              <div className="form-group">
                <label>Select Vehicle</label>
                <select
                  className="form-control"
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  required
                >
                  <option value="">Choose Vehicle...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.name_model}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Category</label>
                  <select
                    className="form-control"
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                  >
                    <option value="Toll">Toll</option>
                    <option value="Fine">Fine</option>
                    <option value="Parking">Parking</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Amount ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    required
                    min={0.01}
                    step="any"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Notes / Description</label>
                <textarea
                  className="form-control"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="Highway toll, speed limit fine etc..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Log Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default FuelExpensePage;
