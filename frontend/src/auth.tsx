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
  return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';
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

  return (
    <div className="auth-container">
      {!tgAvailable && (
        <div className="telegram-down">{isConflict ? 'Бот запущен в другом месте (конфликт). Вход через телеграм может быть недоступен.' : 'Вход через телеграм может быть недоступен. 🐱‍🐉'}</div>
      )}

      {/* Telegram login area — keep visible even if unavailable, highlight when down */}
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
            <input className={tgAvailable ? '' : 'tg-unavailable'} type="text" placeholder="Ваш Telegram ID" value={tgId} onChange={e => setTgId(e.target.value)} />
          )}
          <button className={tgAvailable ? '' : 'tg-unavailable'} onClick={sendCode}>Получить код в Telegram</button>
          {error && <div className="error">{error}</div>}
          {(!tgAvailable && lastErrorMessage) && (
            <div className="error" style={{ marginTop: 8 }}>{isConflict ? 'Бот, возможно, запущен в другом месте (409).': lastErrorMessage}</div>
          )}
        </div>
      )}

      {step === 'code' && (
        <div>
          <h2>Введите код из Telegram</h2>
          <input type="text" placeholder="Код" value={code} onChange={e => setCode(e.target.value)} />
          <button onClick={checkCode}>Войти</button>
          {error && <div className="error">{error}</div>}
        </div>
      )}

      {step === 'success' && <h2>Успешный вход!</h2>}

      {step === 'magiclink' && (
        <div>
          <h2>Вход по ссылке...</h2>
          <p>Пожалуйста, подождите...</p>
        </div>
      )}

      {step === 'error' && (
        <div>
          <h2>Ошибка входа</h2>
          {error && <div className="error">{error}</div>}
        </div>
      )}
    </div>
  );
}
