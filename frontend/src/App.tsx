
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

// Determine backend URL: prefer runtime `window.__RUNTIME__.VITE_API_BASE`, then build-time Vite env, then localhost
const BACKEND_URL = (() => {
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && (window as any).__RUNTIME__ && (window as any).__RUNTIME__.VITE_API_BASE) {
      // @ts-ignore
      return (window as any).__RUNTIME__.VITE_API_BASE;
    }
  } catch (e) {}
  return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';
})();

function getTgIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('tg_id') || '';
}


function App() {
  const navigate = useNavigate();
  // Если сессия есть — сразу редирект на профиль
  useEffect(() => {
    const session = localStorage.getItem('session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.tgId) {
          navigate('/profile');
        }
      } catch {}
    }
  }, [navigate]);
  const [tgId, setTgId] = useState(getTgIdFromUrl());
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'input' | 'code' | 'success' | 'error'>('input');
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ displayName?: string; color?: string; profilePicture?: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    if (!tgId) {
      setUser(null);
      return;
    }
    setLoadingUser(true);
    fetch(`${BACKEND_URL}/auth/user/${tgId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data);
        setLoadingUser(false);
      })
      .catch(() => {
        setUser(null);
        setLoadingUser(false);
      });
  }, [tgId]);

  const sendCode = async () => {
    setError('');
    if (!tgId) {
      setError('Введите ваш Telegram ID');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id: tgId })
      });
      const data = await res.json();
      if (data.success) {
        setStep('code');
      } else {
        setError(data.error || 'Ошибка отправки кода');
      }
    } catch (e) {
      setError('Ошибка соединения с сервером');
    }
  };

  const checkCode = async () => {
    setError('');
    if (!code) {
      setError('Введите код');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/auth/check-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id: tgId, code })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('session', JSON.stringify({ tgId }));
        navigate('/profile');
      } else {
        setStep('error');
        setError('Неверный или просроченный код');
      }
    } catch (e) {
      setError('Ошибка соединения с сервером');
    }
  };

  return (
    <div className="auth-container">
      {step === 'input' && (
        <div>
          {loadingUser ? (
            <div>Загрузка профиля...</div>
          ) : user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {user.profilePicture && (
                <img src={user.profilePicture} alt="profile" style={{ width: 48, height: 48, borderRadius: '50%' }} />
              )}
              <span style={{ fontWeight: 600, color: user.color || undefined }}>{user.displayName}</span>
            </div>
          ) : null}
          {!getTgIdFromUrl() && (
            <input
              type="text"
              placeholder="Ваш Telegram ID"
              value={tgId}
              onChange={e => setTgId(e.target.value)}
            />
          )}
          <button onClick={sendCode}>Получить код в Telegram</button>
          {error && <div className="error">{error}</div>}
        </div>
      )}
      {step === 'code' && (
        <div>
          <h2>Введите код из Telegram</h2>
          <input
            type="text"
            placeholder="Код"
            value={code}
            onChange={e => setCode(e.target.value)}
          />
          <button onClick={checkCode}>Войти</button>
          {error && <div className="error">{error}</div>}
        </div>
      )}
      {step === 'success' && <h2>Успешный вход!</h2>}
      {step === 'error' && (
        <div>
          <h2>Ошибка входа</h2>
          {error && <div className="error">{error}</div>}
        </div>
      )}
    </div>
  );
}

export default App;
