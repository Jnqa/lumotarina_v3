import { useState } from 'react';
import './AdminPanel.css';
import Users from './adminPanel/Users';
import Characters from './adminPanel/Characters';
import UserCreation from './adminPanel/AlternativeAuth';

const BACKEND_URL = (() => {
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && (window as any).__RUNTIME__ && (window as any).__RUNTIME__.VITE_API_BASE) {
      // @ts-ignore
      return (window as any).__RUNTIME__.VITE_API_BASE;
    }
  } catch (e) {}
  return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';
})();

export default function AdminPanel() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState<'users' | 'characters' | 'auth'>('users');

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/admin/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch (e) {
      setError('Connection error');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="admin-login-box">
          <h1>Admin Panel</h1>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button type="submit">Login</button>
          </form>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <button className="logout-btn" onClick={() => setIsAuthenticated(false)}>Logout</button>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-btn ${currentTab === 'users' ? 'active' : ''}`}
          onClick={() => setCurrentTab('users')}
        >
          Users
        </button>
        <button
          className={`tab-btn ${currentTab === 'characters' ? 'active' : ''}`}
          onClick={() => setCurrentTab('characters')}
        >
          Characters
        </button>
        <button
          className={`tab-btn ${currentTab === 'auth' ? 'active' : ''}`}
          onClick={() => setCurrentTab('auth')}
        >
          Create User
        </button>
      </div>

      <div className="admin-content">
        {currentTab === 'users' && <Users password={password} />}
        {currentTab === 'characters' && <Characters />}
        {currentTab === 'auth' && <UserCreation password={password} />}
      </div>
    </div>
  );
}
