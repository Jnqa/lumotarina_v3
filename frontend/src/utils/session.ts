const API_BASE = (() => {
  try { const rt = (window as any).__RUNTIME__; if (rt?.VITE_API_BASE) return rt.VITE_API_BASE; } catch {}
  return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';
})();

export async function fetchSession(): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.success ? j.user : null;
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<string | null> {
  const user = await fetchSession();
  if (!user) return null;
  return user.tgId || user.userId || user.uid || null;
}

export { API_BASE };
