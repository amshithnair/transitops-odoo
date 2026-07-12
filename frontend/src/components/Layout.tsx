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
  IconChart, IconSettings, IconSearch, IconBell, IconSun, IconMoon, IconLogout, IconMenu, IconClose,
} from './Icons';

interface NavItem { path: string; label: string; icon: React.FC<{ size?: number }>; section?: Section; }

const NAV: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: IconDashboard },
  { path: '/vehicles', label: 'Fleet', icon: IconTruck, section: 'fleet' },
  { path: '/drivers', label: 'Drivers', icon: IconUsers, section: 'drivers' },
  { path: '/trips', label: 'Trips', icon: IconRoute, section: 'trips' },
  { path: '/dispatch', label: 'AI Dispatch', icon: IconRoute, section: 'trips' },
  { path: '/map', label: 'Fleet Map', icon: IconRoute },
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
  const [notifOpen, setNotifOpen] = useState(false);

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
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">T</div>
          <div className="brand-text">
            <span className="name">TransitOps</span>
            <span className="tag">Smart Transport Ops</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Operations</div>
          {visible.map((n) => {
            const Icon = n.icon;
            const active = location.pathname === n.path;
            return (
              <Link key={n.path} to={n.path} className={`nav-link ${active ? 'active' : ''}`} onClick={closeMobile}>
                <Icon size={18} />{n.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">TRANSITOPS © 2026 · RBAC v1.0</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn hamburger" onClick={() => setMobileOpen((v) => !v)} title="Menu">
            {mobileOpen ? <IconClose size={17} /> : <IconMenu size={17} />}
          </button>
          <div className="topbar-title">{current?.label || 'TransitOps'}</div>
          <div className="search-box">
            <IconSearch size={15} />
            <input placeholder="Search…" />
          </div>
          <div className="topbar-spacer" />
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
          <div className="user-chip" title={roleLabel(user?.role)}>
            <span className="uname">{user?.name}</span>
            <span className="avatar">{initials}</span>
          </div>
          <button className="icon-btn" onClick={() => { logout(); navigate('/login'); }} title="Logout">
            <IconLogout size={17} />
          </button>
        </header>

        <main className="content">
          <div className="content-inner">{children}</div>
        </main>
      </div>
    </div>
  );
};
