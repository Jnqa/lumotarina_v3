import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './mainPage.css';
import { showToast } from '../utils/toast';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';

// Проверяем сессию через API
async function checkSessionAndGetUser() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      return data.success ? data.user : null;
    }
  } catch (e) {}
  return null;
}

function clearSession() {
  // Выходим через API endpoint
  fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  }).finally(() => {
    window.location.href = '/';
  });
}

export default function MainPage() {
  const nav = useNavigate();
  const [user, setUser] = useState<{ displayName?: string; color?: string; profilePicture?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMaster, setIsMaster] = useState<boolean>(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [characters, setCharacters] = useState<any[] | null>(null);
  const [showRoomConfirm, setShowRoomConfirm] = useState<boolean>(false);

  // Проверяем сессию при загрузке
  useEffect(() => {
    checkSessionAndGetUser().then(user => {
      if (!user || !user.tgId) {
        nav('/auth');
        return;
      }
      setSessionUser(user);
      setLoading(false);
    });
  }, [nav]);

  useEffect(() => {
    if (!sessionUser || !sessionUser.tgId) return;
    fetch(`${API_BASE}/auth/user/${sessionUser.tgId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data));
    
    // load user's characters
    fetch(`${API_BASE}/characters/user/${sessionUser.tgId}`, {
      credentials: 'include'
    })
      .then(res => res.ok ? res.json() : [])
      .then(async (data) => {
        if (!data) return setCharacters([]);
        let arr: any[] = [];
        if (Array.isArray(data)) arr = data.filter(Boolean);
        else if (typeof data === 'object') arr = Object.entries(data).map(([k, v]) => ({ id: k, ...(v || {}) }));
        else return setCharacters([]);

        const classMap: Record<string,string> = {};
        try {
          const manifestResp = await fetch('/templates/classes.json');
          if (manifestResp.ok) {
            const mj = await manifestResp.json();
            if (Array.isArray(mj) && mj.length > 0 && typeof mj[0] === 'object' && (mj[0].id || mj[0].name)) {
              for (const it of mj) {
                if (it && (it.id || it.class)) classMap[String(it.id || it.class)] = it.name || it.title || String(it.id || it.class);
              }
            } else {
              const files = Array.isArray(mj) ? mj : Array.isArray(mj.classes) ? mj.classes : [];
              await Promise.all(files.map(async (f:any) => {
                try {
                  const rf = await fetch(`/templates/classes/${f}`);
                  if (!rf.ok) return;
                  const fj = await rf.json();
                  const id = fj?.id || fj?.class || null;
                  if (id) classMap[String(id)] = fj.name || fj.title || String(id);
                } catch (e) { /* ignore per-file errors */ }
              }));
            }
          }
        } catch (e) { /* ignore manifest error */ }

        const enriched = arr.map((c:any) => ({
          ...c,
          picture: c.picture || 'profile_picture_00.jpg',
          className: classMap[String(c.class)] || c.class || ''
        }));
        setCharacters(enriched);
      });

    // check master status
    try {
      fetch(`${API_BASE}/auth/is_master/${encodeURIComponent(sessionUser.tgId)}`, {
        credentials: 'include'
      })
        .then(res => res.ok ? res.json() : { isMaster: false })
        .then(json => setIsMaster(!!(json && json.isMaster)))
        .catch(() => setIsMaster(false));
    } catch (e) { setIsMaster(false); }
  }, [sessionUser?.tgId]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!(e.target as Node) || menuRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // Apply body class for background
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.add('mainpage-bg');
      return () => {
        document.body.classList.remove('mainpage-bg');
      };
    }
    return;
  }, []);

  const isLoggedIn = !!sessionUser?.tgId;

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="mainpage-container">
      <header className="mainpage-header">
        <div />
        {isLoggedIn ? (
          <div className="mainpage-user" ref={menuRef}>
            <button className="mainpage-user-btn" onClick={() => setMenuOpen(v => !v)}>
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="avatar" className="mainpage-avatar" />
              ) : (
                <div className="mainpage-avatar placeholder" />
              )}
              <span className="mainpage-username" style={{ color: `color-mix(in srgb, ${user?.color || '#fff'}, white 70%)` }}>{user?.displayName || 'Игрок'}</span>
            </button>
            {menuOpen && (
              <div className="mainpage-menu">
                <button className="mainpage-menu-item" onClick={() => showToast('Редактирование профиля - пока не реализовано', { type: 'info' })}>Редактировать профиль</button>
                <button className="mainpage-menu-item" onClick={clearSession}>Выйти</button>
              </div>
            )}
          </div>
        ) : (
          <button className="login-btn" onClick={() => nav('/auth')}>
            <span>Войти</span>
          </button>
        )}
      </header>

      <main className="mainpage-main">
        <section className="mainpage-actions">
          <button className="action-btn" onClick={() => nav('/intro')}>
            <span className="action-icon">📖</span>
            <span>Введение</span>
          </button>
          
          <button className="action-btn" onClick={() => nav('/rewind')}>
            <span className="action-icon">⏳</span>
            <span>История игр</span>
          </button>
          

          
          <button className="action-btn" onClick={() => nav('/lore')}>
            <span className="action-icon">📜</span>
            <span>Лор</span>
          </button>
          
          <button className="action-btn" onClick={() => nav('/lore/map')}>
            <span className="action-icon">🗺️</span>
            <span>Карта</span>
          </button>

          {isLoggedIn && isMaster && (
            <button className="action-btn admin-btn" onClick={() => nav('/admin-panel')}>
              <span className="action-icon">⚙️</span>
              <span>Админская панель</span>
            </button>
          )}

          {isLoggedIn && isMaster && (
            // обратно к modal - setShowRoomConfirm(true)}>
            <button className="action-btn master-btn" onClick={() => {setShowRoomConfirm(false); nav('/dm')}}>
              <span className="action-icon">🎭</span>
              <span>Комната Мастера</span>
            </button>
          )}
        </section>

        {isLoggedIn && (
          <section className="mainpage-characters">
            <h3>Персонажи</h3>
            <div className="character-list">
              {characters === null && <div className="loading">Загрузка...</div>}
              {characters && characters.length === 0 && (
                <div className="character-card empty">
                  <div className="character-info">
                    <div className="no-character">Нет персонажа</div>
                  </div>
                  <div className="character-actions">
                    <button className="create-btn" onClick={() => { window.location.href = '/creator/character' }}>Создать персонажа</button>
                  </div>
                </div>
              )}
            {characters && characters.length > 0 && (
              <div className="character-grid">
                {characters.map((c: any, idx: number) => (
                  <div key={c.id || idx} className="character-tile" onClick={() => {
                    const ownerId = sessionUser?.tgId || 'default';
                    nav(`/app/${encodeURIComponent(ownerId)}/${encodeURIComponent(c.id)}`);
                  }}>
                    <div className="tile-left">
                      <img src={`${c.picture || '/profile_pictures/profile_picture_00.jpg'}`} alt={c.name || 'avatar'} />
                    </div>
                    <div className="tile-right">
                      <div className="tile-name">{c.name || 'Без имени'}</div>
                      <div className="tile-class">{c.className || c.class || ''}</div>
                    </div>
                  </div>
                ))}
                <div className="character-actions">
                  <button className="create-btn" onClick={() => { window.location.href = '/creator/character' }}>Создать персонажа</button>
                </div>
              </div>
            )}
          </div>
        </section>
        )}
      </main>

      {isLoggedIn && showRoomConfirm && (
        <div className="modal-overlay" onClick={()=>setShowRoomConfirm(false)}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <h3>Это путь в комнату ведущего</h3>
            <p>Ты действительно хочешь продолжить?</p>
            <div className="modal-buttons">
              <button className="modal-btn cancel" onClick={()=>setShowRoomConfirm(false)}>Нет, вернуться</button>
              <button className="modal-btn confirm" onClick={()=>{ setShowRoomConfirm(false); nav('/master-room'); }}>V1</button>
              <button className="modal-btn confirm" onClick={()=>{ setShowRoomConfirm(false); nav('/dm'); }}>V2</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}