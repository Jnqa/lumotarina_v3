import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './mainPage.css';
import { showToast } from '../utils/toast';
import Auth from '../auth';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';

// ─── Backgrounds ───────────────────────────────────────────────────
const BACKGROUNDS = [
  '/pics/backgrounds/Background_01.png',
  '/pics/backgrounds/Background_02.png',
  '/pics/backgrounds/Background_basics.png',
  '/pics/backgrounds/Background_intro.png',
];

function getRandomBackground(): string {
  return BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
}

// ─── Splash phrases ────────────────────────────────────────────────
const SPLASH_PHRASES = [
  'Твоя история ждёт',
  'За этими вратами — судьба',
  'Кубик брошен, путь открыт',
  'Мир помнит каждый выбор',
  'Свет или тьма — решаешь ты',
  'Герои не рождаются — ими становятся',
  'Бросок определяет судьбу',
];

// ─── SVG icons (вместо эмодзи) ─────────────────────────────────────
const IconBook = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

const IconScroll = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/>
    <line x1="9" y1="13" x2="15" y2="13"/>
    <line x1="9" y1="17" x2="15" y2="17"/>
  </svg>
);

const IconHourglass = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 22h14M5 2h14"/>
    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/>
    <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
  </svg>
);

const IconMap = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/>
    <line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
);

const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const IconMask = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C6.5 2 2 6 2 11v4c0 1.1.9 2 2 2h1c0 1.1.9 2 2 2s2-.9 2-2h6c0 1.1.9 2 2 2s2-.9 2-2h1c1.1 0 2-.9 2-2v-4c0-5-4.5-9-10-9z"/>
    <path d="M9.5 15.5c.83.63 1.94 1 3 1s2.17-.37 3-1"/>
    <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

// ─── Skeleton loader component ─────────────────────────────────────
const CharacterTileSkeleton = () => (
  <div className="character-tile skeleton">
    <div className="tile-left">
      <div className="skeleton-img" />
    </div>
    <div className="tile-right">
      <div className="skeleton-name" />
      <div className="skeleton-class" />
    </div>
  </div>
);

// ─── API helpers ───────────────────────────────────────────────────
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
  fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
    .finally(() => { window.location.href = '/'; });
}

const LOADER_MIN_MS = 1600;

// ─── Component ─────────────────────────────────────────────────────
export default function MainPage() {
  const nav = useNavigate();
  const [user, setUser] = useState<{ displayName?: string; color?: string; profilePicture?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMaster, setIsMaster] = useState<boolean>(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [splashPhrase, setSplashPhrase] = useState(
    () => SPLASH_PHRASES[Math.floor(Math.random() * SPLASH_PHRASES.length)]
  );
  const [splashFade, setSplashFade] = useState(false);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [splashDone, setSplashDone] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [characters, setCharacters] = useState<any[] | null>(null);
  const [showRoomConfirm, setShowRoomConfirm] = useState<boolean>(false);

  // Случайный фон
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const bg = getRandomBackground();
    document.body.classList.add('mainpage-bg');
    document.body.style.backgroundImage = `url("${bg}")`;
    return () => {
      document.body.classList.remove('mainpage-bg');
      document.body.style.backgroundImage = '';
    };
  }, []);

  // Прогресс-бар
  useEffect(() => {
    let prog = 0;
    const tick = setInterval(() => {
      prog += Math.random() * 4 + 1;
      if (prog >= 100) { prog = 100; clearInterval(tick); }
      setLoaderProgress(Math.min(prog, 100));
    }, 60);
    return () => clearInterval(tick);
  }, []);

  // Смена фраз
  useEffect(() => {
    const iv = setInterval(() => {
      setSplashFade(true);
      setTimeout(() => {
        setSplashPhrase(SPLASH_PHRASES[Math.floor(Math.random() * SPLASH_PHRASES.length)]);
        setSplashFade(false);
      }, 400);
    }, 3200);
    return () => clearInterval(iv);
  }, []);

  // Проверка сессии + старт анимации
  useEffect(() => {
    const t0 = Date.now();
    checkSessionAndGetUser().then(u => {
      const delay = Math.max(0, LOADER_MIN_MS - (Date.now() - t0));
      setTimeout(() => {
        setSessionUser(u?.tgId ? u : null);
        // Плавно показываем контент
        requestAnimationFrame(() => {
          containerRef.current?.classList.add('visible');
        });
        // Плавно скрываем сплэш через transition (класс fade-out)
        const splash = document.querySelector('.mainpage-loading-screen') as HTMLElement | null;
        if (splash) {
          splash.classList.add('fade-out');
          splash.addEventListener('transitionend', () => {
            setSplashDone(true);
          }, { once: true });
        } else {
          setSplashDone(true);
        }
      }, delay);
    });
  }, []);

  // Данные пользователя
  useEffect(() => {
    if (!sessionUser?.tgId) return;
    fetch(`${API_BASE}/auth/user/${sessionUser.tgId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data));

    fetch(`${API_BASE}/characters/user/${sessionUser.tgId}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(async (data) => {
        if (!data) return setCharacters([]);
        let arr: any[] = [];
        if (Array.isArray(data)) arr = data.filter(Boolean);
        else if (typeof data === 'object') arr = Object.entries(data).map(([k, v]) => ({ id: k, ...(v || {}) }));
        else return setCharacters([]);

        const classMap: Record<string, string> = {};
        try {
          const mResp = await fetch('/templates/classes.json');
          if (mResp.ok) {
            const mj = await mResp.json();
            if (Array.isArray(mj) && mj.length > 0 && (mj[0].id || mj[0].name)) {
              for (const it of mj) {
                if (it?.id || it?.class) classMap[String(it.id || it.class)] = it.name || it.title || String(it.id || it.class);
              }
            } else {
              const files = Array.isArray(mj) ? mj : (mj.classes ?? []);
              await Promise.all(files.map(async (f: any) => {
                try {
                  const rf = await fetch(`/templates/classes/${f}`);
                  if (!rf.ok) return;
                  const fj = await rf.json();
                  const id = fj?.id || fj?.class || null;
                  if (id) classMap[String(id)] = fj.name || fj.title || String(id);
                } catch {}
              }));
            }
          }
        } catch {}

        setCharacters(arr.map((c: any) => ({
          ...c,
          picture: c.picture || 'profile_picture_00.jpg',
          className: classMap[String(c.class)] || c.class || '',
        })));
      });

    try {
      fetch(`${API_BASE}/auth/is_master/${encodeURIComponent(sessionUser.tgId)}`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : { isMaster: false })
        .then(json => setIsMaster(!!(json?.isMaster)))
        .catch(() => setIsMaster(false));
    } catch { setIsMaster(false); }
  }, [sessionUser?.tgId]);

  // Закрытие меню при клике вне
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const isLoggedIn = !!sessionUser?.tgId;

  return (
    <>
      {/* ─── Splash ─── */}
      {!splashDone && (
        <div className="mainpage-loading-screen">
          <div className="loader-rune">⚔</div>

          <div className="loader-phrase" style={{ opacity: splashFade ? 0 : 1 }}>
            {splashPhrase}
          </div>

          <div className="loader-bar-wrap">
            <div className="loader-bar" style={{ width: `${loaderProgress}%`, transition: 'width 0.12s linear' }} />
          </div>
        </div>
      )}

      {/* ─── Main ─── */}
      <div className="mainpage-container" ref={containerRef}>
        <header className="mainpage-header">
          <div className="mainpage-logo">Lumotarina</div>

          {isLoggedIn ? (
            <div className="mainpage-user" ref={menuRef}>
              <button className="mainpage-user-btn" onClick={() => setMenuOpen(v => !v)}>
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="avatar" className="mainpage-avatar" />
                ) : (
                  <div className="mainpage-avatar placeholder">
                    {user?.displayName?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <span className="mainpage-username">{user?.displayName || 'Игрок'}</span>
              </button>
              {menuOpen && (
                <div className="mainpage-menu">
                  <button
                    className="mainpage-menu-item"
                    onClick={() => showToast('Редактирование профиля — пока не реализовано', { type: 'info' })}
                  >
                    Редактировать профиль
                  </button>
                  <button className="mainpage-menu-item" onClick={clearSession}>Выйти</button>
                </div>
              )}
            </div>
          ) : (
            <button className="login-btn" onClick={() => nav('/auth')}>Войти</button>
          )}
        </header>

        <main className="mainpage-main">
          <p className="section-heading">Навигация</p>
          <section className="mainpage-actions">
            <button className="action-btn" onClick={() => nav('/intro')}>
              <div className="action-icon"><IconBook /></div>
              <span className="action-btn-label">Введение</span>
            </button>

            <button className="action-btn" onClick={() => nav('/rewind')}>
              <div className="action-icon"><IconHourglass /></div>
              <span className="action-btn-label">История игр</span>
            </button>

            <button className="action-btn" onClick={() => nav('/lore')}>
              <div className="action-icon"><IconScroll /></div>
              <span className="action-btn-label">Лор</span>
            </button>

            <button className="action-btn" onClick={() => nav('/lore/map')}>
              <div className="action-icon"><IconMap /></div>
              <span className="action-btn-label">Карта</span>
            </button>

            {isLoggedIn && isMaster && (
              <button className="action-btn admin-btn" onClick={() => nav('/admin-panel')}>
                <div className="action-icon"><IconSettings /></div>
                <span className="action-btn-label">Админ панель</span>
              </button>
            )}

            {isLoggedIn && isMaster && (
              <button className="action-btn master-btn" onClick={() => { setShowRoomConfirm(false); nav('/dm'); }}>
                <div className="action-icon"><IconMask /></div>
                <span className="action-btn-label">Комната мастера</span>
              </button>
            )}
          </section>

          {isLoggedIn && (
            <section className="mainpage-characters">
              <p className="section-heading">Мои персонажи</p>
              <div className="character-list">
                {characters === null && (
                  <div className="character-grid">
                    <CharacterTileSkeleton />
                    <CharacterTileSkeleton />
                    <CharacterTileSkeleton />
                  </div>
                )}

                {characters?.length === 0 && (
                  <div className="character-card empty">
                    <div className="no-character">Нет персонажа</div>
                    <button className="create-btn" onClick={() => { window.location.href = '/character/create'; }}>
                      + Создать персонажа
                    </button>
                  </div>
                )}

                {characters && characters.length > 0 && (
                  <div className="character-grid">
                    {characters.map((c: any, idx: number) => (
                      <div
                        key={c.id || idx}
                        className="character-tile"
                        onClick={() => nav(`/app/${encodeURIComponent(sessionUser.tgId)}/${encodeURIComponent(c.id)}`)}
                      >
                        <div className="tile-left">
                          <img src={c.picture || '/profile_pictures/profile_picture_00.jpg'} alt={c.name || 'avatar'} />
                        </div>
                        <div className="tile-right">
                          <div className="tile-name">{c.name || 'Без имени'}</div>
                          <div className="tile-class">{c.className || c.class || ''}</div>
                        </div>
                        <div className="tile-arrow">›</div>
                      </div>
                    ))}
                    <div className="character-actions">
                      <button className="create-btn" onClick={() => { window.location.href = '/character/create'; }}>
                        + Создать персонажа
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>

        {!isLoggedIn && (
          <section className="mainpage-auth-section">
            <div className="auth-container-inline"><Auth /></div>
          </section>
        )}

        {isLoggedIn && showRoomConfirm && (
          <div className="modal-overlay" onClick={() => setShowRoomConfirm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Комната ведущего</h3>
              <p>Ты действительно хочешь войти?</p>
              <div className="modal-buttons">
                <button className="modal-btn cancel" onClick={() => setShowRoomConfirm(false)}>Назад</button>
                <button className="modal-btn confirm" onClick={() => { setShowRoomConfirm(false); nav('/master-room'); }}>V1</button>
                <button className="modal-btn confirm" onClick={() => { setShowRoomConfirm(false); nav('/dm'); }}>V2</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}