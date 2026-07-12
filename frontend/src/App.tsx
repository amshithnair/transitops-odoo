import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import VehiclesPage from './pages/VehiclesPage';
import DriversPage from './pages/DriversPage';
import TripsPage from './pages/TripsPage';
import MaintenancePage from './pages/MaintenancePage';
import FuelExpensePage from './pages/FuelExpensePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import PassportPage from './pages/PassportPage';

const wrap = (el: React.ReactNode) => <Layout>{el}</Layout>;

const App: React.FC = () => (
  <AuthProvider>
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* All screens reachable by any authenticated user (full nav, per mockup).
            Access is scoped inside each page: view-only vs full CRUD per RBAC matrix. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={wrap(<DashboardPage />)} />
          <Route path="/vehicles" element={wrap(<VehiclesPage />)} />
          <Route path="/vehicles/:id/passport" element={wrap(<PassportPage />)} />
          <Route path="/maintenance" element={wrap(<MaintenancePage />)} />
          <Route path="/drivers" element={wrap(<DriversPage />)} />
          <Route path="/trips" element={wrap(<TripsPage />)} />
          <Route path="/fuel-expense" element={wrap(<FuelExpensePage />)} />
          <Route path="/reports" element={wrap(<ReportsPage />)} />
          <Route path="/settings" element={wrap(<SettingsPage />)} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  </AuthProvider>
);

export default App;
