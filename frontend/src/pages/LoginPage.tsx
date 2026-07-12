import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // 1. Authenticate and get token
      const loginRes = await client.post('/auth/login', { email, password });
      const { access_token } = loginRes.data;

      // Temporary set token in localstorage so the interceptor can pick it up
      localStorage.setItem('token', access_token);

      // 2. Fetch authenticated user profile
      const userRes = await client.get('/auth/me');
      
      // 3. Commit to context
      login(access_token, userRes.data);
      
      // 4. Redirect
      navigate('/');
    } catch (err: any) {
      localStorage.removeItem('token');
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Login failed. Please verify connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="text-center">TransitOps Portal</h1>
        <p className="text-center text-muted">Log in to manage fleet operations</p>
        
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@transitops.com"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p className="text-muted text-center" style={{ fontSize: '12px' }}>
            Demo logins:<br />
            Manager: fleet@transitops.com (fleet123)<br />
            Driver: driver@transitops.com (driver123)<br />
            Safety: safety@transitops.com (safety123)<br />
            Finance: finance@transitops.com (finance123)
          </p>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
