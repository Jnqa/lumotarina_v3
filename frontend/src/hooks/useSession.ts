/**
 * useSession — хук для проверки сессии через cookie.
 *
 * Использование на любой странице:
 *
 *   import { useSession } from '../hooks/useSession';
 *
 *   function MyPage() {
 *     const { user, loading } = useSession();
 *     if (loading) return <Spinner />;
 *     if (!user) return <div>Не авторизован</div>;
 *     return <div>Привет, {user.displayName}</div>;
 *   }
 *
 * Хук делает ONE запрос к /auth/me при монтировании.
 * Результат кешируется в sessionStorage чтобы не дёргать сервер
 * при навигации между страницами в одной вкладке.
 */

import { useEffect, useState } from 'react';
import { fetchSession } from '../utils/session';

const CACHE_KEY = 'session_user_cache';
const CACHE_TTL = 60_000; // 1 минута

interface SessionUser {
  tgId?: string;
  userId?: string;
  displayName?: string;
  color?: string;
  profilePicture?: string;
  [key: string]: any;
}

interface SessionCache {
  user: SessionUser | null;
  ts: number;
}

function readCache(): SessionUser | null | undefined {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const c: SessionCache = JSON.parse(raw);
    if (Date.now() - c.ts > CACHE_TTL) return undefined;
    return c.user;
  } catch {
    return undefined;
  }
}

function writeCache(user: SessionUser | null) {
  try {
    const c: SessionCache = { user, ts: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {}
}

export function clearSessionCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
}


export function useSession(_options?: { redirect?: string }) {
  const cached = readCache();

  const [user, setUser] = useState<SessionUser | null>(
    cached !== undefined ? cached : null
  );
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    // Если кеш свежий — не идём на сервер
    if (cached !== undefined) return;

    let cancelled = false;
    fetchSession().then(u => {
      if (cancelled) return;
      writeCache(u);
      setUser(u);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const isLoggedIn = !!(user?.tgId || user?.userId);

  return { user, loading, isLoggedIn };
}