import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

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
  const nav = useNavigate();
  const [user, setUser] = useState<{ displayName?: string; color?: string; profilePicture?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const session = getSession();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!session.tgId) return;
    fetch(`${BACKEND_URL}/auth/user/${session.tgId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data));
  }, [session.tgId]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!(e.target as Node) || menuRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  if (!session.tgId) {
    return <div className="profile-empty">Нет сессии. <a href="/">Войти</a></div>;
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div />
        <div className="profile-user" ref={menuRef}>
          <button className="profile-user-btn" onClick={() => setMenuOpen(v => !v)}>
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="avatar" className="profile-avatar" />
            ) : (
              <div className="profile-avatar placeholder" />
            )}
            <span className="profile-username" style={{ color: user?.color || '#fff' }}>{user?.displayName || 'Игрок'}</span>
          </button>
          {menuOpen && (
            <div className="profile-menu">
              <button className="profile-menu-item" onClick={() => alert('Edit profile - not implemented yet')}>Edit Profile</button>
              <button className="profile-menu-item" onClick={clearSession}>Logout</button>
            </div>
          )}
        </div>
      </header>

      <main className="profile-main">
        <section className="profile-actions-grid">
          <button className="square-btn lore-btn" onClick={() => nav('/lore')}><span>Lore</span></button>
          <button className="square-btn map-btn" onClick={() => nav('/lore/map')}><span>Map</span></button>
        </section>

        <section className="profile-character">
          <h3>Персонаж:</h3>
          <div className="character-card">
            <div className="character-info">
              <div className="no-character">Нет персонажа</div>
            </div>
            <div className="character-actions">
              <button className="primary-btn" onClick={() => { window.location.href = '/character/create' }}>Создать Персонажа</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
