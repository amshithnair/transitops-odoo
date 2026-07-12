import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { ALL_ROLES, ROLE_LABELS, ROLE_COLORS, ROLE_SCOPE } from '../lib/roles';

export const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await client.post('/auth/forgot-password', { email });
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await client.post('/auth/verify-otp', { email, otp });
      setResetCode(res.data.reset_code);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await client.post('/auth/reset-password', { email, reset_code: resetCode, new_password: newPassword });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrap">
      <aside className="login-aside">
        <div className="a-content">
          <div className="brand">
            <div className="brand-logo" />
            TRANSITOPS
          </div>
          <div className="a-tagline">Secure Fleet Operations</div>
          <p className="a-desc">
            Recover your account securely using your registered email address.
            An OTP will be sent to verify your identity.
          </p>

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
        {step === 1 && (
          <form className="login-form" onSubmit={handleSendOtp}>
            <h1>Forgot Password</h1>
            <div className="lf-sub">Enter your email to receive a reset code</div>
            {error && <div className="alert alert-danger">{error}</div>}
            
            <div className="field">
              <label>Email Address</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@transitops.in" />
            </div>
            
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send OTP'}
            </button>
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Link to="/login" className="link">Back to Login</Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="login-form" onSubmit={handleVerifyOtp}>
            <h1>Verify OTP</h1>
            <div className="lf-sub">Enter the 6-digit code sent to {email}</div>
            {error && <div className="alert alert-danger">{error}</div>}
            
            <div className="field">
              <label>OTP Code</label>
              <input className="input" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder="123456" maxLength={6} />
            </div>
            
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <span className="link" onClick={() => setStep(1)} style={{ cursor: 'pointer' }}>Go back</span>
            </div>
          </form>
        )}

        {step === 3 && (
          <form className="login-form" onSubmit={handleResetPassword}>
            <h1>Reset Password</h1>
            <div className="lf-sub">Create a new password for your account</div>
            {error && <div className="alert alert-danger">{error}</div>}
            
            <div className="field">
              <label>New Password</label>
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Min 8 chars, 1 uppercase, 1 digit" />
            </div>
            
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

export default ForgotPasswordPage;
