import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
    { path: '/vehicles', label: 'Vehicles', roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
    { path: '/drivers', label: 'Drivers', roles: ['fleet_manager', 'safety_officer'] },
    { path: '/trips', label: 'Trips', roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
    { path: '/maintenance', label: 'Maintenance', roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
    { path: '/fuel-expense', label: 'Fuel & Expenses', roles: ['fleet_manager', 'driver', 'financial_analyst'] },
    { path: '/reports', label: 'Reports', roles: ['fleet_manager', 'safety_officer', 'financial_analyst'] },
  ];

  const formatRole = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>TransitOps</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            if (hasRole(item.roles as UserRole[])) {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              );
            }
            return null;
          })}
        </nav>
      </aside>

      {/* Main content wrapper */}
      <div className="main-content-wrapper">
        {/* Top Navbar */}
        <header className="navbar">
          <div className="navbar-left">
            <h3>{navItems.find(item => item.path === location.pathname)?.label || 'Portal'}</h3>
          </div>
          <div className="navbar-right">
            {user && (
              <div className="user-profile">
                <span className="user-name">{user.name}</span>
                <span className="role-badge">{formatRole(user.role)}</span>
                <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
};
