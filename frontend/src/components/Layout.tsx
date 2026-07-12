import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { roleLabel, type Section } from '../lib/roles';
import {
  IconDashboard, IconTruck, IconUsers, IconRoute, IconWrench, IconFuel,
  IconChart, IconSettings, IconSearch, IconBell, IconSun, IconMoon, IconLogout,
} from './Icons';

interface NavItem { path: string; label: string; icon: React.FC<{ size?: number }>; section?: Section; }

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

  // Mockup shows the full nav for every role; access is scoped inside each page (view vs edit).
  const visible = NAV;
  const current = NAV.find((n) => n.path === location.pathname);
  const initials = (user?.name || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
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
              <Link key={n.path} to={n.path} className={`nav-link ${active ? 'active' : ''}`}>
                <Icon size={18} />{n.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">TRANSITOPS © 2026 · RBAC v1.0</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">{current?.label || 'TransitOps'}</div>
          <div className="search-box">
            <IconSearch size={15} />
            <input placeholder="Search…" />
          </div>
          <div className="topbar-spacer" />
          <button className="icon-btn" title="Notifications"><IconBell size={17} /><span className="dot" /></button>
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
