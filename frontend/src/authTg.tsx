/**
 * authTg.tsx — Telegram-аутентификация через бота (код в чат).
 *
 * Отдельный компонент, не мешает основному auth.tsx.
 * Подключать там где нужен именно TG-вход:
 *
 *   import AuthTg from './authTg';
 *   <AuthTg onSuccess={() => navigate('/')} />
 */

import { useEffect, useState } from 'react';

const BACKEND_URL = (() => {
  try {
    const rt = (window as any).__RUNTIME__;
    if (rt?.VITE_API_BASE) return rt.VITE_API_BASE;
  } catch {}
  return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';
})();

function getTgIdFromUrl() {
  return new URLSearchParams(window.location.search).get('tg_id') || '';
}

interface AuthTgProps {
  onSuccess: () => void;
}

export default function AuthTg({ onSuccess }: AuthTgProps) {
  const [tgId, setTgId] = useState(getTgIdFromUrl());
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'input' | 'code'>('input');
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(true);
  const [conflict, setConflict] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/auth/telegram-status`)
      .then(r => r.json())
      .then(j => {
        setAvailable(!!j.available);
        setLastError(j.lastErrorMessage || null);
        setConflict(!!j.isConflict);
      })
      .catch(() => { setAvailable(false); });
  }, []);

  useEffect(() => {
    if (!tgId) { setUser(null); return; }
    setLoadingUser(true);
    fetch(`${BACKEND_URL}/auth/user/${tgId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setUser(d); setLoadingUser(false); })
      .catch(() => { setUser(null); setLoadingUser(false); });
  }, [tgId]);

  const sendCode = async () => {
    setError('');
    if (!tgId) { setError('Введите ваш Telegram ID'); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/auth/send-code`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id: tgId }),
      });
      const data = await res.json();
      if (data.success) setStep('code');
      else setError(data.error || 'Ошибка отправки кода');
    } catch { setError('Ошибка соединения'); }
  };

  const checkCode = async () => {
    setError('');
    if (!code) { setError('Введите код'); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/auth/check-code`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id: tgId, code }),
      });
      const data = await res.json();
      if (data.success) onSuccess();
      else setError('Неверный или просроченный код');
    } catch { setError('Ошибка соединения'); }
  };

  return (
    <div className="link-section">
      {!available && (
        <div className="telegram-down">
          {conflict
            ? 'Бот запущен в другом месте (конфликт). Вход может быть недоступен.'
            : 'Вход через Telegram может быть недоступен.'}
        </div>
      )}

      {step === 'input' && (
        <>
          {loadingUser ? (
            <div className="auth-status-text">...</div>
          ) : user ? (
            <div className="previewName">
              {user.profilePicture && (
                <img
                  src={user.profilePicture}
                  alt="profile"
                  style={{ width: 34, height: 34, borderRadius: '50%' }}
                />
              )}
              <span style={{ color: user.color || 'inherit' }}>{user.displayName}</span>
            </div>
          ) : null}

          {!getTgIdFromUrl() && (
            <input
              className={available ? 'auth-input tg-available' : 'auth-input tg-unavailable'}
              type="text"
              placeholder="Ваш Telegram ID"
              value={tgId}
              onChange={e => setTgId(e.target.value)}
            />
          )}

          <button
            className={available ? 'in-btn' : 'in-btn tg-unavailable'}
            onClick={sendCode}
          >
            Получить код в Telegram
          </button>

          {error && <div className="error">{error}</div>}
          {!available && lastError && (
            <div className="error">
              {conflict ? 'Бот запущен в другом месте (409).' : lastError}
            </div>
          )}
        </>
      )}

      {step === 'code' && (
        <>
          <div className="auth-status-text">Введите код из Telegram</div>
          <input
            className="auth-input"
            type="text"
            placeholder="Код"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkCode()}
            autoFocus
          />
          <button className="in-btn" onClick={checkCode}>Войти</button>
          {error && <div className="error">{error}</div>}
        </>
      )}
    </div>
  );
}