import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canView, type Section } from '../lib/roles';

interface ProtectedRouteProps { section?: Section; }

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ section }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="center-load"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (section && !canView(user.role, section)) return <Navigate to="/" replace />;

  return <Outlet />;
};
