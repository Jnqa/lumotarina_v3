import { useEffect, useState } from 'react';

const BACKEND_URL = 'http://10.47.7.21:3001';

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('session') || '{}');
  } catch {
    return {};
  }
}

function clearSession() {
  localStorage.removeItem('session');
  window.location.href = '/';
}

export default function Profile() {
  const [user, setUser] = useState<{ displayName?: string; color?: string; profilePicture?: string } | null>(null);
  const session = getSession();

  useEffect(() => {
    if (!session.tgId) return;
    fetch(`${BACKEND_URL}/auth/user/${session.tgId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data));
  }, [session.tgId]);

  if (!session.tgId) {
    return <div>Нет сессии. <a href="/">Войти</a></div>;
  }

  return (
    <div className="profile-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user?.profilePicture && (
          <img src={user.profilePicture} alt="profile" style={{ width: 48, height: 48, borderRadius: '50%' }} />
        )}
        <span style={{ fontWeight: 600, color: user?.color || undefined }}>{user?.displayName}</span>
        <button onClick={clearSession}>Выйти</button>
      </div>
      <div style={{ marginTop: 24 }}>
        Персонаж:
      </div>
    </div>
  );
}
