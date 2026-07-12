import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type UserRole, type User } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import client from '../api/client';
import { ALL_ROLES, ROLE_LABELS, ROLE_SCOPE } from '../lib/roles';
import { CustomSelect } from '../components/ui';
import { IconSun, IconMoon, IconEye, IconEyeOff } from '../components/Icons';

const DEMO: Record<UserRole, { email: string; pass: string; name: string }> = {
  superadmin:        { email: 'admin@transitops.com',    pass: 'admin123',   name: 'Root Admin' },
  fleet_manager:     { email: 'fleet@transitops.com',   pass: 'fleet123',   name: 'Maya Fleet' },
  driver:            { email: 'dispatch@transitops.com', pass: 'driver123',  name: 'Raven K.' },
  safety_officer:    { email: 'safety@transitops.com',   pass: 'safety123',  name: 'Sara Vale' },
  financial_analyst: { email: 'finance@transitops.com',  pass: 'finance123', name: 'Dev Anand' },
};

const MAX_ATTEMPTS = 5;

export const LoginPage: React.FC = () => {
  const [role, setRole] = useState<UserRole>('driver');
  const [email, setEmail] = useState(DEMO.driver.email);
  const [password, setPassword] = useState(DEMO.driver.pass);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const locked = attempts >= MAX_ATTEMPTS;

  const pickRole = (r: UserRole) => {
    setRole(r);
    setEmail(DEMO[r].email);
    setPassword(DEMO[r].pass);
  };

  const demoLogin = () => {
    const now = new Date().toISOString();
    const user: User = { id: `demo-${role}`, name: DEMO[role].name, email, role, is_active: true, created_at: now };
    login('demo-token', user);
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await client.post('/auth/login', { email, password });
      const token = res.data.access_token;
      localStorage.setItem('token', token);
      const me = await client.get('/auth/me');
      login(token, me.data);
      navigate('/');
    } catch (err: unknown) {
      const e2 = err as { response?: { status?: number; data?: { detail?: string } } };
      // No response = backend offline -> demo mode so the UI is fully explorable.
      if (!e2.response) { demoLogin(); return; }
      localStorage.removeItem('token');
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) setError(`Account locked after ${MAX_ATTEMPTS} failed attempts. Try again later.`);
      else setError(e2.response.data?.detail || `Invalid credentials. ${MAX_ATTEMPTS - next} attempt(s) left.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrap">
      {/* Desktop left aside (hidden on mobile) */}
      <aside className="login-aside">
        <div>
          <div className="a-top">
            <div className="brand-mark" style={{ transform: 'rotate(45deg)' }}>
              <div className="brand-mark-inner"></div>
            </div>
            <div className="brand-text">
              <span className="name">TransitOps</span>
              <span className="tag">Smart Transport Operations</span>
            </div>
          </div>

          <h1 style={{ marginTop: '64px', marginBottom: '24px', fontSize: '38px', fontWeight: '800' }}>
            One login,<br />four roles.
          </h1>

          <div className="roles-list">
            {[
              { role: 'fleet_manager', color: '#10b981', scope: 'Fleet · Maintenance' },
              { role: 'driver', color: '#3b82f6', scope: 'Dashboard · Trips' },
              { role: 'safety_officer', color: '#f59e0b', scope: 'Drivers · Compliance' },
              { role: 'financial_analyst', color: '#8b5cf6', scope: 'Fuel/Expenses · Analytics' }
            ].map((item) => (
              <div className="role-item" key={item.role}>
                <span className="rdot" style={{ background: item.color }} />
                <span className="rname">{ROLE_LABELS[item.role as UserRole]}</span>
                <span className="rdesc">{item.scope}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="a-foot">TRANSITOPS © 2026 · RBAC v2.0</div>
      </aside>

      {/* Mobile-only hero header (hidden on desktop) */}
      <div className="login-mobile-hero">
        <div className="lmh-top">
          <div className="lmh-brand">
            <div className="brand-mark" style={{ transform: 'rotate(45deg)', width: 28, height: 28 }}>
              <div className="brand-mark-inner" style={{ width: 12, height: 12 }}></div>
            </div>
            <div className="brand-text">
              <span className="name" style={{ fontSize: 16 }}>TransitOps</span>
              <span className="tag" style={{ fontSize: 9 }}>Smart Transport Operations</span>
            </div>
          </div>
          <button className="icon-btn lmh-theme-btn" onClick={toggle} title="Toggle theme">
            {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
          </button>
        </div>
        <h2 className="lmh-headline">One login,<br />four roles.</h2>
        <div className="lmh-pills">
          {[
            { label: 'Fleet Manager', color: '#10b981' },
            { label: 'Dispatcher', color: '#3b82f6' },
            { label: 'Safety Officer', color: '#f59e0b' },
            { label: 'Financial Analyst', color: '#8b5cf6' },
          ].map((item) => (
            <span key={item.label} className="lmh-pill">
              <span className="lmh-dot" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <main className="login-main">
        {/* Desktop theme toggle (hidden on mobile since mobile has it in hero) */}
        <button 
          className="icon-btn login-theme-btn-desktop" 
          onClick={toggle} 
          title="Toggle theme"
          style={{ position: 'absolute', top: 24, right: 24 }}
        >
          {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
        </button>
        <form className="login-form" onSubmit={handleSubmit}>
          <h1>Sign in to your account</h1>
          <div className="lf-sub">Enter your credentials to continue</div>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@transitops.in" />
          </div>
          <div className="field">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                className="input" 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••" 
                style={{ paddingRight: 40, width: '100%' }}
              />
              <button 
                type="button"
                className="icon-btn"
                style={{ position: 'absolute', right: 4, top: 4, height: '32px', width: '32px', background: 'transparent', border: 'none', boxShadow: 'none' }}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>
          <div className="field">
            <label>Role (scopes your access)</label>
            <CustomSelect 
              value={role} 
              onChange={(v) => pickRole(v as UserRole)}
              options={ALL_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }))}
            />
          </div>

          <div className="flex items-center" style={{ justifyContent: 'space-between', margin: '4px 0 18px' }}>
            <label className="checkbox"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Remember me</label>
            <span className="link">Forgot password?</span>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting || locked}>
            {locked ? 'Account Locked' : submitting ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="login-scope">
            <div className="ls-head">Access is scoped by role after login</div>
            {ALL_ROLES.map((r) => (
              <div className="ls-line" key={r}><b>{ROLE_LABELS[r]}</b> → {ROLE_SCOPE[r]}</div>
            ))}
          </div>

          <div className="demo-hint">
            Demo: pick a role above (credentials auto-fill). If the backend is offline you'll enter a live demo of that role.
          </div>
        </form>
      </main>
    </div>
  );
};
export default LoginPage;
