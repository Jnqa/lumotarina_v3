import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Rewind.css';
import Reader from './components/reader';
import { useSession } from '../hooks/useSession';

interface RewindItem {
  id: string;
  title: string;
  description?: string;
  date?: string;
  characters?: Array<{ name: string; picture?: string }>;
  charactersID?: string[];
  content: string;
  tags?: string[];
  allowedTgIds?: string[];
  allowedUserIds?: string[];
  public?: boolean;
  publishedAt?: string;
  url?: string; // legacy, maps to content
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('session') || '{}');
  } catch {
    return {};
  }
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';

const manifestUrl = `${API_BASE}/get-lore/rewind`;

export default function Rewind() {
  const navigate = useNavigate();
  const [items, setItems] = useState<RewindItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<any>(getSession());
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);

  // Apply body bg class (same pattern as mainPage)
  useEffect(() => {
    document.body.classList.add('rewind-bg');
    return () => document.body.classList.remove('rewind-bg');
  }, []);

  useEffect(() => {
    // try to fetch session from backend (cookie-based)
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        if (r.ok) {
          const j = await r.json();
          if (j?.success && j.user) setSession(j.user);
        }
      } catch (e) {
        // ignore
      }
    })();

    async function loadManifest() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(manifestUrl);
        if (!response.ok) {
          throw new Error(`Не удалось загрузить список: ${response.status}`);
        }

        const data = await response.json();
        const list: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data.games)
          ? data.games
          : [];

        setItems(
          list.map((item: any) => ({
            id: String(item.id || item.url || item.title || 'unknown'),
            title: item.title || item.name || 'Без названия',
            description: item.description || item.summary || '',
            date: item.date || item.publishedAt || '',
            characters: Array.isArray(item.characters)
              ? item.characters.map((ch: any) => (typeof ch === 'string' ? { name: ch } : ch))
              : [],
            charactersID: Array.isArray(item.charactersID) ? item.charactersID : [],
            content: item.content || item.url || item.link || '#',
            tags: Array.isArray(item.tags) ? item.tags : [],
            allowedTgIds: Array.isArray(item.allowedTgIds) ? item.allowedTgIds : Array.isArray(item.allowedUsers) ? item.allowedUsers : [],
            allowedUserIds: Array.isArray(item.allowedUserIds) ? item.allowedUserIds : [],
            public: item.public !== false,
            publishedAt: item.publishedAt || item.date || item.createdAt || '',
            url: item.content || item.url || item.link || '#', // для обратной совместимости
          })) as RewindItem[]
        );
      } catch (err: any) {
        setError(err?.message || 'Ошибка при загрузке списка истории.');
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    loadManifest();
  }, []);

  const allowedItems = useMemo(() => {
    if (!items) return [];
    const userId = String(session?.userId || session?.tgId || '').trim();

    return items.filter((item) => {
      if (item.public) return true;
      if (item.allowedTgIds?.length && userId && item.allowedTgIds.includes(userId)) return true;
      if (item.allowedUserIds?.length && userId && item.allowedUserIds.includes(userId)) return true;
      return false;
    });
  }, [items, session]);

  const isLoggedIn = Boolean(session?.userId || session?.tgId);

  // If items include charactersID entries like "ownerId.charId", fetch their names from backend
  useEffect(() => {
    if (!items || items.length === 0) return;

    const toResolve = items
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => Array.isArray((it as any).charactersID) && (it as any).charactersID.length > 0);

    if (toResolve.length === 0) return;

    let cancelled = false;

    (async () => {
      const updated = [...items];
      await Promise.all(
        toResolve.map(async ({ it, idx }) => {
          try {
            const ids = (it as any).charactersID as string[];
            const chars: Array<{ name: string; picture?: string }> = [];
            await Promise.all(ids.map(async (cid) => {
              const parts = String(cid).split('.');
              const owner = parts[0];
              const charId = parts[1] || '';
              if (!owner || !charId) return;
              const url = `${API_BASE}/characters/user/${owner}/${charId}?fields=name,picture`;
              const r = await fetch(url, { credentials: 'include' });
              if (!r.ok) return;
              const j = await r.json();
              if (j && (j.name || j.title)) {
                chars.push({ name: j.name || j.title, picture: j.picture });
              }
            }));
            if (!cancelled) {
              updated[idx] = { ...it, characters: chars } as RewindItem;
            }
          } catch (e) {
            // ignore per-item errors
          }
        })
      );
      if (!cancelled) setItems(updated as RewindItem[]);
    })();

    return () => { cancelled = true; };
  }, [items]);

  function openReader(url: string) {
    setReaderUrl(url);
    setReaderOpen(true);
  }

  function closeReader() {
    setReaderOpen(false);
    setReaderUrl(null);
  }

  return (
    <div className="rewind-container">
      <div className="rewind-header">
        <div className="rewind-header-text">
          <h1>История игр</h1>
          <p>Записи и материалы сессий</p>
        </div>
        <button className="rewind-back-btn" onClick={() => navigate('/')}>← Назад</button>
      </div>

      {loading && <div className="rewind-message">Загрузка...</div>}
      {error && <div className="rewind-message rewind-error">{error}</div>}

      {!loading && !error && (
        <>
          {!isLoggedIn && (
            <div className="rewind-note">
              Чтобы увидеть материалы с ограниченным доступом, войдите в систему.
            </div>
          )}

          {allowedItems.length === 0 ? (
            <div className="rewind-empty">
              <p>Пока нет доступных материалов.</p>
              <p>Если вы уверены, что они должны быть доступны, обратитесь к мастеру.</p>
            </div>
          ) : (
            <div className="rewind-list">
              {allowedItems.map((item) => (
                <article key={item.id} className="rewind-card">
                  <div className="rewind-card-header">
                    <div>
                      <h2>{item.title}</h2>
                      {(item.date || item.publishedAt) && <span>{item.date || item.publishedAt}</span>}
                    </div>
                    <button onClick={() => openReader(item.content)} className="rewind-link">
                      Открыть
                    </button>
                  </div>
                  {item.description && <p>{item.description}</p>}
                  {item.characters && item.characters.length > 0 && (
                    <div className="rewind-characters">
                      {item.characters.map((character) => (
                        <div key={character.name} className="rewind-character-row">
                          {character.picture && (
                            <img src={character.picture} alt={character.name} className="rewind-character-picture" />
                          )}
                          <span>{character.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="rewind-tags">
                      {item.tags.map((tag) => (
                        <span key={tag} className="rewind-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {readerOpen && readerUrl && (
        <div className="rewind-reader-overlay">
          <Reader url={readerUrl} onClose={closeReader} />
        </div>
      )}
    </div>
  );
}