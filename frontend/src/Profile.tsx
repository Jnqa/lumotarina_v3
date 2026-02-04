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
  const [isMaster, setIsMaster] = useState<boolean>(false);
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

    // check master status
    try {
      fetch(`${API_BASE}/auth/is_master/${encodeURIComponent(session.tgId)}`)
        .then(res => res.ok ? res.json() : { isMaster: false })
        .then(json => setIsMaster(!!(json && json.isMaster)))
        .catch(() => setIsMaster(false));
    } catch (e) { setIsMaster(false); }
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

  // Apply a body class so the background image is shown only on the /profile route
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.add('profile-bg');
      return () => {
        document.body.classList.remove('profile-bg');
      };
    }
    return;
  }, []);

  if (!session.tgId) {
    return <div className="profile-empty">Нет сессии. <a href="/">Войти</a></div>;
  }

  return (
    <>
      <svg style={{ display: 'none' }} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <filter id="displacementFilter">
          <feImage
            href="data:image/png;base64,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"
            preserveAspectRatio="none"
          />

          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale="600"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

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
            <span className="profile-username" style={{ color: `color-mix(in srgb, ${user?.color || '#fff'}, white 70%)` }}>{user?.displayName || 'Игрок'}</span>
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
          <button className="liquid-btn" onClick={() => nav('/intro')}>Введение</button>
          {isMaster && (
            <button className="liquid-btn" onClick={() => setShowRoomConfirm(true)} id="MasterRoom">MasterRoom</button>
          ) || (<button className="liquid-btn">События</button> )}
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
                  <button className="primary-btn" onClick={() => { window.location.href = '/creator/character' }}>Создать Персонажа</button>
                </div>
              </div>
            )}
            {characters && characters.length > 0 && (
              <div className="character-grid">
                {characters.map((c: any, idx: number) => (
                  <div key={c.id || idx} className="character-tile" onClick={() => { nav('/character/edit', { state: { character: c } }); }}>
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
                  <button className="primary-btn" onClick={() => { window.location.href = '/creator/character' }}>Создать Персонажа</button>
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
            <div style={{display:'inline',gap:8,justifyContent:'flex-between',marginTop:12}}>
              <button className="delete-btn" onClick={()=>setShowRoomConfirm(false)}>Нет, вернуться</button>
              <button className="save-btn" onClick={()=>{ setShowRoomConfirm(false); nav('/master-room'); }}>Да, продолжить</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
