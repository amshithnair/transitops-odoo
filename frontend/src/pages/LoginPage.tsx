import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type UserRole, type User } from '../context/AuthContext';
import client from '../api/client';
import { ALL_ROLES, ROLE_LABELS, ROLE_COLORS, ROLE_SCOPE } from '../lib/roles';

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
  const { login } = useAuth();
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
      <aside className="login-aside">
        <div>
          <div className="a-top">
            <div className="brand-mark" style={{ width: 40, height: 40, fontSize: 18 }}>T</div>
            <div>
              <h2>TransitOps</h2>
            </div>
          </div>
          <div className="a-tag">Smart Transport Operations Platform</div>

          <div className="roles-list">
            <div className="rl-head">One login · four roles</div>
            {ALL_ROLES.map((r) => (
              <div className="role-item" key={r}>
                <span className="rdot" style={{ background: ROLE_COLORS[r] }} />
                <div>
                  <div className="rname">{ROLE_LABELS[r]}</div>
                  <div className="rdesc">{ROLE_SCOPE[r]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="a-foot">TRANSITOPS © 2026 · RBAC v1.0 · Role-scoped access</div>
      </aside>

      <main className="login-main">
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
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <div className="field">
            <label>Role (scopes your access)</label>
            <select className="select" value={role} onChange={(e) => pickRole(e.target.value as UserRole)}>
              {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
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
