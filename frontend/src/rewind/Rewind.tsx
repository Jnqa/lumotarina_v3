import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Rewind.css';

interface RewindItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  tags: string[];
  allowedTgIds?: string[];
  allowedUserIds?: string[];
  public?: boolean;
  publishedAt?: string;
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('session') || '{}');
  } catch {
    return {};
  }
}

const manifestUrl = (import.meta as any).env?.VITE_REWIND_MANIFEST || '/rewind_list.json';

export default function Rewind() {
  const navigate = useNavigate();
  const [items, setItems] = useState<RewindItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const session = getSession();

  useEffect(() => {
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
          : Array.isArray(data.items)
          ? data.items
          : [];

        setItems(
          list.map((item: any) => ({
            id: String(item.id || item.url || item.title || 'unknown'),
            title: item.title || item.name || 'Без названия',
            description: item.description || item.summary || '',
            url: item.url || item.link || '#',
            tags: Array.isArray(item.tags) ? item.tags : [],
            allowedTgIds: Array.isArray(item.allowedTgIds) ? item.allowedTgIds : Array.isArray(item.allowedUsers) ? item.allowedUsers : [],
            allowedUserIds: Array.isArray(item.allowedUserIds) ? item.allowedUserIds : [],
            public: item.public !== false,
            publishedAt: item.publishedAt || item.date || item.createdAt || '',
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
    const tgId = String(session?.tgId || '').trim();

    return items.filter((item) => {
      if (item.public) return true;
      if (item.allowedTgIds?.length && tgId && item.allowedTgIds.includes(tgId)) return true;
      if (item.allowedUserIds?.length && tgId && item.allowedUserIds.includes(tgId)) return true;
      return false;
    });
  }, [items, session]);

  const isLoggedIn = Boolean(session?.tgId);

  return (
    <div className="rewind-container">
      <div className="rewind-header">
        <div>
          <h1>История игр</h1>
          <p>Сюда загружается список материалов и записей, доступных для просмотра.</p>
        </div>
        <button className="rewind-back-btn" onClick={() => navigate('/')}>Назад</button>
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
                      {item.publishedAt && <span>{item.publishedAt}</span>}
                    </div>
                    <a href={item.url} target="_blank" rel="noreferrer" className="rewind-link">
                      Открыть
                    </a>
                  </div>
                  {item.description && <p>{item.description}</p>}
                  {item.tags?.length > 0 && (
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
    </div>
  );
}
