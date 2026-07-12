import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../lib/useData';
import { buildNotifications, type Notice } from '../lib/notifications';
import { demoVehicles, demoDrivers, demoTrips, demoMaintenance } from '../lib/demo';
import type { Vehicle, Driver, Trip, Maintenance } from '../lib/types';
import { roleLabel, type Section } from '../lib/roles';
import {
  IconDashboard, IconTruck, IconUsers, IconRoute, IconWrench, IconFuel,
  IconChart, IconSettings, IconSearch, IconBell, IconSun, IconMoon, IconMenu, IconClose, IconLogout,
} from './Icons';
import { Modal } from './ui';

interface NavItem { path: string; label: string; icon: React.FC<{ size?: number; className?: string }>; section?: Section; }

const NAV: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: IconDashboard },
  { path: '/vehicles', label: 'Fleet', icon: IconTruck, section: 'fleet' },
  { path: '/drivers', label: 'Drivers', icon: IconUsers, section: 'drivers' },
  { path: '/trips', label: 'Trips', icon: IconRoute, section: 'trips' },
  { path: '/maintenance', label: 'Maintenance', icon: IconWrench, section: 'fleet' },
  { path: '/fuel-expense', label: 'Fuel & Expenses', icon: IconFuel, section: 'fuel' },
  { path: '/reports', label: 'Analytics', icon: IconChart, section: 'analytics' },
  { path: '/settings', label: 'Settings', icon: IconSettings },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const { data: vehicles } = useData<Vehicle[]>('/vehicles', demoVehicles);
  const { data: drivers } = useData<Driver[]>('/drivers', demoDrivers);
  const { data: trips } = useData<Trip[]>('/trips', demoTrips);
  const { data: maint } = useData<Maintenance[]>('/maintenance', demoMaintenance);
  const notices: Notice[] = buildNotifications(
    Array.isArray(vehicles) ? vehicles : demoVehicles,
    Array.isArray(drivers) ? drivers : demoDrivers,
    Array.isArray(trips) ? trips : demoTrips,
    Array.isArray(maint) ? maint : demoMaintenance,
  );

  const visible = NAV;
  const current = NAV.find((n) => n.path === location.pathname);
  const initials = (user?.name || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const closeMobile = () => setMobileOpen(false);
  return (
    <div className="app-shell">
      {mobileOpen && <div className="sidebar-backdrop open" onClick={closeMobile} />}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <div className="brand-mark-inner"></div>
          </div>
          <div className="brand-text">
            <span className="name">TransitOps</span>
            <span className="tag">Smart Transport Operations</span>
          </div>
        </div>

        <div className="sidebar-search">
          <IconSearch size={15} />
          <input placeholder="Search" />
        </div>

        <nav className="sidebar-nav">
          {visible.map((n) => {
            const active = location.pathname === n.path;
            return (
              <Link key={n.path} to={n.path} className={`nav-link ${active ? 'active' : ''}`} onClick={closeMobile} title={n.label}>
                <n.icon size={18} className="nav-icon" />
                <span className="nav-link-label">{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-profile-box">
            <div className="profile-details">
              <div className="profile-avatar">{initials}</div>
              <div className="profile-text">
                <div className="profile-name">{user?.name || 'Raven K.'}</div>
                <div className="profile-role">{roleLabel(user?.role) || 'Fleet Manager'}</div>
              </div>
            </div>
            <button 
              className="icon-btn logout-btn" 
              onClick={() => setLogoutModalOpen(true)} 
              title="Logout"
            >
              <IconLogout size={16} />
            </button>
          <button className="go-to-hub-btn" onClick={() => navigate('/')} title="Go to Hub">
            <span className="hub-text">Go to Hub</span>
            <span className="hub-arrow" style={{ fontSize: '11px', fontWeight: 'bold' }}>↗</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button 
            className="icon-btn hamburger" 
            onClick={() => {
              if (window.innerWidth <= 768) setMobileOpen(v => !v);
              else setSidebarCollapsed(v => !v);
            }} 
            title="Menu"
          >
            {mobileOpen ? <IconClose size={17} /> : <IconMenu size={17} />}
          </button>
          <div className="topbar-title">{current?.label || 'TransitOps'}</div>
          <div className="topbar-spacer" />
          
          <div className="topbar-stats">
            <span className="topbar-stat-item"><span className="dot dot-green" /> 0 ISSUES</span>
            <span className="topbar-stat-item"><span className="dot dot-yellow" /> 3 DELAYS</span>
            <span className="topbar-stat-item"><span className="dot dot-blue" /> 5 ON TRACK</span>
          </div>

          <div className="notif-wrap">
            <button className="icon-btn" title="Notifications" onClick={() => setNotifOpen((v) => !v)}>
              <IconBell size={17} />{notices.length > 0 && <span className="dot" />}
            </button>
            {notifOpen && (
              <div className="notif-panel" onMouseLeave={() => setNotifOpen(false)}>
                <div className="notif-head">Notifications ({notices.length})</div>
                {notices.length === 0 && <div className="notif-empty">All clear — no alerts.</div>}
                {notices.map((n) => (
                  <div className="notif-item" key={n.id}>
                    <span className="notif-dot" style={{ background: `var(--${n.severity})` }} />
                    <div>
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-detail">{n.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button className="icon-btn" onClick={toggle} title="Toggle theme">
            {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
          </button>
        </header>

        <main className="content">
          <div className="content-inner">{children}</div>
        </main>
      </div>

      {logoutModalOpen && (
        <Modal
          title="Confirm Logout"
          onClose={() => setLogoutModalOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setLogoutModalOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-muted)' }}>
            Are you sure you want to log out of TransitOps?
          </p>
        </Modal>
      )}
    </div>
  );
};
