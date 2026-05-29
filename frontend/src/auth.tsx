import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './auth.css';

const BACKEND_URL = (() => {
  try {
    const rt = (window as any).__RUNTIME__;
    if (rt?.VITE_API_BASE) return rt.VITE_API_BASE;
  } catch {}
  return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';
})();

function getMagicLinkToken() {
  return new URLSearchParams(window.location.search).get('token') || '';
}

async function checkSession() {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return data.success ? data.user : null;
    }
  } catch {}
  return null;
}

export default function Auth() {
  const navigate = useNavigate();
  const magicToken = getMagicLinkToken();

  const [step, setStep] = useState<'input' | 'magiclink' | 'success' | 'error'>('input');
  const [loginMode, setLoginMode] = useState<'link' | 'password'>('password');
  const [error, setError] = useState('');

  const [magicLinkInput, setMagicLinkInput] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    setBgIndex(Math.floor(Math.random() * 10));
  }, []);

  // Редирект если уже авторизован
  useEffect(() => {
    checkSession().then(u => { if (u) navigate('/'); });
  }, [navigate]);

  // Автообработка magic link из URL
  useEffect(() => {
    if (magicToken && step === 'input') processMagicLink(magicToken);
  }, [magicToken]);

  const processMagicLink = async (token: string) => {
    setStep('magiclink');
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/auth/token`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) navigate('/');
      else { setStep('error'); setError(data.error || 'Недействительная или истёкшая ссылка'); }
    } catch {
      setStep('error');
      setError('Ошибка соединения');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMagicLinkInput(text);
      const m = text.match(/[?&]token=([^&]+)/);
      if (m?.[1]) processMagicLink(m[1]);
      else setError('Ссылка не содержит токена входа');
    } catch {
      setError('Нет доступа к буферу обмена');
    }
  };

  const handleLoginByLink = () => {
    if (!magicLinkInput) { setError('Вставьте ссылку входа'); return; }
    const m = magicLinkInput.match(/[?&]token=([^&]+)/);
    if (m?.[1]) processMagicLink(m[1]);
    else setError('Ссылка не содержит токена входа');
  };

  const handleLoginPassword = async () => {
    setError('');
    if (!username || !password) { setError('Введите логин и пароль'); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) navigate('/');
      else setError(data.error || 'Неверный логин или пароль');
    } catch {
      setError('Ошибка соединения');
    }
  };

  const bgStyle = {
    backgroundImage: `url('/media/images/login/background_${String(bgIndex).padStart(2, '0')}.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'scroll',
  };

  return (
    <div className="auth-container">

      {/* ─── Main login panel ─── */}
      <div className="auth-panel" style={bgStyle}>
        <h3>Вход</h3>

        {step === 'input' && (
          <div className="link-section">

            {loginMode === 'link' ? (
              <div className="link-line">
                <button className="paste-btn" onClick={handlePaste} aria-label="Вставить ссылку">📋</button>
                <input
                  className="auth-link-input"
                  type="text"
                  placeholder="Вставьте ссылку входа..."
                  value={magicLinkInput}
                  onChange={e => setMagicLinkInput(e.target.value)}
                />
                <button className="in-btn" style={{ width: 'auto', padding: '0 14px' }} onClick={handleLoginByLink}>→</button>
              </div>
            ) : (
              <>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Логин"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLoginPassword()}
                />
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Пароль"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLoginPassword()}
                />
                <button className="in-btn" onClick={handleLoginPassword}>Войти</button>
              </>
            )}

            <div className="login-mode-toggle">
              <button
                className={`toggle-btn ${loginMode === 'password' ? 'active' : ''}`}
                onClick={() => { setLoginMode('password'); setError(''); }}
              >
                Логин / Пароль
              </button>
              <button
                className={`toggle-btn ${loginMode === 'link' ? 'active' : ''}`}
                onClick={() => { setLoginMode('link'); setError(''); }}
              >
                По ссылке
              </button>
            </div>

            {error && <div className="error">{error}</div>}
          </div>
        )}

        {step === 'magiclink' && (
          <div className="link-section">
            <div className="auth-status-text">Проверяем ссылку...</div>
          </div>
        )}
      </div>

      {/* ─── Error state ─── */}
      {step === 'error' && (
        <div className="auth-panel">
          <h2 style={{ color: 'rgba(240,120,100,0.9)' }}>✕ Ошибка входа</h2>
          {error && <div className="error">{error}</div>}
        </div>
      )}

      <div className="pwa-install">
        Можно установить на главный экран как приложение 😉
      </div>
    </div>
  );
}