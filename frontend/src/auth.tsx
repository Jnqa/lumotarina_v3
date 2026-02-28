import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './auth.css';

// Determine backend URL (same logic as App.tsx)
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

function getTgIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('tg_id') || '';
}

function getMagicLinkToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || '';
}

export default function Auth() {
  const navigate = useNavigate();
  const magicToken = getMagicLinkToken();
  const [tgId, setTgId] = useState(getTgIdFromUrl());
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'input' | 'code' | 'success' | 'error' | 'alt' | 'magiclink'>('input');
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [tgAvailable, setTgAvailable] = useState(true);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [loginMode, setLoginMode] = useState<'telegram' | 'link'>('telegram');
  const [magicLinkInput, setMagicLinkInput] = useState('');
  const [backgroundImage, setBackgroundImage] = useState(0);
  const [backgroundImage2, setBackgroundImage2] = useState(0);

  // Set random background images on mount
  useEffect(() => {
    const randomBg1 = Math.floor(Math.random() * 10);
    const randomBg2 = Math.floor(Math.random() * 10);
    setBackgroundImage(randomBg1);
    setBackgroundImage2(randomBg2);
  }, []);

  useEffect(() => {
    // Handle magic link login if token is in URL
    if (magicToken && step === 'input') {
      processMagicLink(magicToken);
    }
  }, [magicToken, step]);

  const processMagicLink = async (token: string) => {
    setStep('magiclink');
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/auth/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.success && data.user && data.user.tg_id) {
        localStorage.setItem('session', JSON.stringify({ tgId: data.user.tg_id }));
        navigate('/profile');
      } else {
        setStep('error');
        setError(data.error || 'Invalid or expired magic link');
      }
    } catch (e) {
      setStep('error');
      setError('Connection error');
    }
  };

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

  useEffect(() => {
    fetch(`${BACKEND_URL}/auth/telegram-status`).then(r => r.json()).then(j => {
      setTgAvailable(!!j.available);
      setLastErrorMessage(j.lastErrorMessage || null);
      setIsConflict(!!j.isConflict);
    }).catch(() => { setTgAvailable(false); setLastErrorMessage(null); setIsConflict(false); });
  }, []);

  useEffect(() => {
    if (!tgId) {
      setUser(null);
      return;
    }
    setLoadingUser(true);
    fetch(`${BACKEND_URL}/auth/user/${tgId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { setUser(data); setLoadingUser(false); })
      .catch(() => { setUser(null); setLoadingUser(false); });
  }, [tgId]);

  const sendCode = async () => {
    setError('');
    if (!tgId) { setError('Введите ваш Telegram ID'); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/auth/send-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tg_id: tgId })
      });
      const data = await res.json();
      if (data.success) setStep('code'); else setError(data.error || 'Ошибка отправки кода');
    } catch (e) { setError('Ошибка соединения с сервером'); }
  };

  const checkCode = async () => {
    setError('');
    if (!code) { setError('Введите код'); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/auth/check-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tg_id: tgId, code })
      });
      const data = await res.json();
      if (data.success) { localStorage.setItem('session', JSON.stringify({ tgId })); navigate('/profile'); }
      else { setStep('error'); setError('Неверный или просроченный код'); }
    } catch (e) { setError('Ошибка соединения с сервером'); }
  };

  const handlePasteMagicLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMagicLinkInput(text);
      // Try to extract token from pasted URL
      const tokenMatch = text.match(/[?&]token=([^&]+)/);
      if (tokenMatch && tokenMatch[1]) {
        processMagicLink(tokenMatch[1]);
      } else {
        setError('Ссылка не содержит токена входа');
        setLoginMode('link');
      }
    } catch (e) {
      setError('Не удалось получить доступ к буферу обмена');
      setLoginMode('link');
    }
  };

  const handleLoginByLink = () => {
    if (!magicLinkInput) {
      setError('Вставьте ссылку входа');
      setLoginMode('link');
      return;
    }
    const tokenMatch = magicLinkInput.match(/[?&]token=([^&]+)/);
    if (tokenMatch && tokenMatch[1]) {
      processMagicLink(tokenMatch[1]);
    } else {
      setError('Ссылка не содержит токена входа');
      setLoginMode('link');
    }
  };

  return (
    <div className="auth-container">
      {/* Telegram Login Panel */}
      <div 
        className="auth-panel" 
        style={{ backgroundImage: `url('/media/images/login/background_${String(backgroundImage).padStart(2, '0')}.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'scroll' }}
      >
        <h3>Вход через бота Telegram</h3>
        
        {!tgAvailable && (
          <div className="telegram-down">{isConflict ? 'Бот запущен в другом месте (конфликт). Вход может быть недоступен.' : 'Вход через телеграм может быть недоступен. 🐱‍🐉'}</div>
        )}

        {step === 'input' && loginMode === 'telegram' && (
          <div className="telegram-section">
            {loadingUser ? (
              <div style={{ color: '#ffffff' }}>...</div>
            ) : user ? (
              <div className="previewName">
                {user.profilePicture && (
                  <img src={user.profilePicture} alt="profile" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                )}
                <span style={{ fontWeight: 600, color: user.color || '#fff', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)' }}>{user.displayName}</span>
              </div>
            ) : null}
            {!getTgIdFromUrl() && (
              <input 
                className={tgAvailable ? 'tg-available' : 'tg-unavailable'} 
                type="text" 
                placeholder="Ваш Telegram ID"
                value={tgId} 
                onChange={e => setTgId(e.target.value)} 
              />
            )}
            <button className={tgAvailable ? 'in-btn' : 'tg-unavailable'} onClick={sendCode}>Получить код в Telegram</button>
            {error && <div className="error">{error}</div>}
            {(!tgAvailable && lastErrorMessage) && (
              <div className="error">{isConflict ? 'Бот, возможно, запущен в другом месте (409).': lastErrorMessage}</div>
            )}
          </div>
        )}

        {step === 'code' && (
          <div className="telegram-section">
            <h4 style={{ color: '#ddd' }}>Введите код из Telegram</h4>
            <input type="text" placeholder="Код" value={code} onChange={e => setCode(e.target.value)} />
            <button className="paste-btn" onClick={checkCode}>Войти</button>
            {error && <div className="error">{error}</div>}
          </div>
        )}
      </div>

      {/* Magic Link Login Panel */}
      <div 
        className="auth-panel" 
        style={{ backgroundImage: `url('/media/images/login/background_${String(backgroundImage2).padStart(2, '0')}.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'scroll' }}
      >
        <h3>🔗 Вход по ссылке</h3>
        
        {step === 'input' && (
          <div className="link-section">
            <div className="link-line">
              <button className="paste-btn" onClick={handlePasteMagicLink} aria-label="Paste link">📋</button>
              <input
                className="auth-link-input"
                type="text"
                placeholder="Вставьте ссылку входа..."
                value={magicLinkInput}
                onChange={e => setMagicLinkInput(e.target.value)}
              />
              <button className="in-btn" onClick={handleLoginByLink} aria-label="Login by link">🚪</button>
            </div>
            {error && loginMode === 'link' && <div className="error">{error}</div>}
          </div>
        )}

        {step === 'magiclink' && (
          <div style={{ color: '#aaa' }}>
            <p>Вход по ссылке...</p>
            <p>Пожалуйста, подождите...</p>
          </div>
        )}
      </div>

      {/* Success/Error States */}
      {step === 'success' && (
        <div className="auth-panel" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ color: '#51cf66' }}>✓ Успешный вход!</h2>
        </div>
      )}

      {step === 'error' && (
        <div className="auth-panel" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ color: '#ff6b6b' }}>✕ Ошибка входа</h2>
          {error && <div className="error">{error}</div>}
        </div>
      )}
      <div className='pwa-install'>
        Если хочешь, можешь установить на главный экран как приложение 😉 Сделал красиво 💅
      </div>
    </div>
  );
}
