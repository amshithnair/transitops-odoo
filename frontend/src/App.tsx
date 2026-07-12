import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VehiclesPage from './pages/VehiclesPage';
import DriversPage from './pages/DriversPage';
import TripsPage from './pages/TripsPage';
import MaintenancePage from './pages/MaintenancePage';
import FuelExpensePage from './pages/FuelExpensePage';
import ReportsPage from './pages/ReportsPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public login route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            {/* Any role access */}
            <Route
              path="/"
              element={
                <Layout>
                  <DashboardPage />
                </Layout>
              }
            />
            <Route
              path="/vehicles"
              element={
                <Layout>
                  <VehiclesPage />
                </Layout>
              }
            />
            <Route
              path="/trips"
              element={
                <Layout>
                  <TripsPage />
                </Layout>
              }
            />
            <Route
              path="/maintenance"
              element={
                <Layout>
                  <MaintenancePage />
                </Layout>
              }
            />

            {/* Manager and Safety Officer only */}
            <Route element={<ProtectedRoute allowedRoles={['fleet_manager', 'safety_officer']} />}>
              <Route
                path="/drivers"
                element={
                  <Layout>
                    <DriversPage />
                  </Layout>
                }
              />
            </Route>

            {/* Manager, Driver, and Finance Analyst only */}
            <Route element={<ProtectedRoute allowedRoles={['fleet_manager', 'driver', 'financial_analyst']} />}>
              <Route
                path="/fuel-expense"
                element={
                  <Layout>
                    <FuelExpensePage />
                  </Layout>
                }
              />
            </Route>

            {/* Manager, Safety Officer, and Finance Analyst only */}
            <Route element={<ProtectedRoute allowedRoles={['fleet_manager', 'safety_officer', 'financial_analyst']} />}>
              <Route
                path="/reports"
                element={
                  <Layout>
                    <ReportsPage />
                  </Layout>
                }
              />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
