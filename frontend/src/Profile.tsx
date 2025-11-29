import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import { showToast } from './utils/toast';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';

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
  const [characters, setCharacters] = useState<any[] | null>(null);
  const [showRoomConfirm, setShowRoomConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (!session.tgId) return;
    fetch(`${API_BASE}/auth/user/${session.tgId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data));
    // load user's characters
    fetch(`${API_BASE}/characters/user/${session.tgId}`)
      .then(res => res.ok ? res.json() : [])
      .then(async (data) => {
        // backend returns object map or array; normalize to array
        if (!data) return setCharacters([]);
        let arr: any[] = [];
        if (Array.isArray(data)) arr = data.filter(Boolean);
        else if (typeof data === 'object') arr = Object.entries(data).map(([k, v]) => ({ id: k, ...(v || {}) }));
        else return setCharacters([]);

        // Build a class lookup by fetching /templates/classes.json once,
        // then fetching each listed class file only once when manifest provides filenames.
        const classMap: Record<string,string> = {};
        try {
          const manifestResp = await fetch('/templates/classes.json');
          if (manifestResp.ok) {
            const mj = await manifestResp.json();
            // If manifest already contains class objects, map directly
            if (Array.isArray(mj) && mj.length > 0 && typeof mj[0] === 'object' && (mj[0].id || mj[0].name)) {
              for (const it of mj) {
                if (it && (it.id || it.class)) classMap[String(it.id || it.class)] = it.name || it.title || String(it.id || it.class);
              }
            } else {
              // manifest is likely a list of filenames; fetch each file once
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
              <button className="profile-menu-item" onClick={() => showToast('Edit profile - not implemented yet', { type: 'info' })}>Edit Profile</button>
              <button className="profile-menu-item" onClick={clearSession}>Logout</button>
            </div>
          )}
        </div>
      </header>

      <main className="profile-main">
        <section className="profile-actions-grid">
          <button className="simple-btn" onClick={() => nav('/intro')}>Введение</button>
          <button className="simple-btn" onClick={() => setShowRoomConfirm(true)}>Комната Ведущего</button>
          <button className="square-btn lore-btn" onClick={() => nav('/lore')}><span>Лор</span></button>
          <button className="square-btn map-btn" onClick={() => nav('/lore/map')}><span>Карта</span></button>
        </section>

        <section className="profile-character">
          <h3>Персонажи:</h3>
          <div className="character-list">
            {characters === null && <div>Загрузка...</div>}
            {characters && characters.length === 0 && (
              <div className="character-card">
                <div className="character-info"><div className="no-character">Нет персонажа</div></div>
                <div className="character-actions">
                  <button className="primary-btn" onClick={() => { window.location.href = '/character/create' }}>Создать Персонажа</button>
                </div>
              </div>
            )}
            {characters && characters.length > 0 && (
              <div className="character-grid">
                {characters.map((c: any, idx: number) => (
                  <div key={c.id || idx} className="character-tile" onClick={() => { nav('/character/edit', { state: { character: c } }); }}>
                    <div className="tile-left">
                      <img src={`/profile_pictures/${c.picture || 'profile_picture_00.jpg'}`} alt={c.name || 'avatar'} />
                    </div>
                    <div className="tile-right">
                      <div className="tile-name">{c.name || 'Без имени'}</div>
                      <div className="tile-class">{c.className || c.class || ''}</div>
                    </div>
                  </div>
                ))}
                <div className="character-actions">
                  <button className="primary-btn" onClick={() => { window.location.href = '/character/create' }}>Создать Персонажа</button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {showRoomConfirm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60}} onClick={()=>setShowRoomConfirm(false)}>
          <div style={{background:'#0d0d0d',padding:16,borderRadius:8,width:420}} onClick={(e)=>e.stopPropagation()}>
            <h3>Это путь в комнату ведущего</h3>
            <p>Ты действительно хочешь продолжить?</p>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
              <button className="delete-btn" onClick={()=>setShowRoomConfirm(false)}>Нет, вернуться</button>
              <button className="save-btn" onClick={()=>{ setShowRoomConfirm(false); nav('/master-room'); }}>Да, продолжить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
