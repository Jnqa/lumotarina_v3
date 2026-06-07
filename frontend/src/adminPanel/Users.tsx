import { useState, useEffect } from 'react';
import './AdminPanel.css';

const BACKEND_URL = (() => {
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && (window as any).__RUNTIME__ && (window as any).__RUNTIME__.VITE_API_BASE) {
      // @ts-ignore
      return (window as any).__RUNTIME__.VITE_API_BASE;
    }
  } catch (e) {}
  return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';
})();

interface User {
  tg_id: string;
  displayName?: string;
  color?: string;
  profilePicture?: string;
  username?: string;
}

interface UsersProps {
  password: string;
}

export default function Users({ password }: UsersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [magicLinks, setMagicLinks] = useState<{ [key: string]: string }>({});
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedMagicLink, setSelectedMagicLink] = useState<string | null>(null);
  const [magicLinkUser, setMagicLinkUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [password]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/admin/users?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (e) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const generateMagicLink = async (tg_id: string, user?: User) => {
    setGeneratingLink(tg_id);
    try {
      const res = await fetch(`${BACKEND_URL}/admin/generate-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id, password })
      });
      const data = await res.json();
      if (data.success) {
        const frontendUrl = window.location.origin;
        const magicLink = `${frontendUrl}/auth/magic-link?token=${data.token}`;
        setMagicLinks(prev => ({ ...prev, [tg_id]: magicLink }));
        setSelectedMagicLink(magicLink);
        setMagicLinkUser(user || users.find((item) => item.tg_id === tg_id) || null);
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Connection error');
    } finally {
      setGeneratingLink(null);
    }
  };

  const openMagicLinkModal = async (user: User) => {
    const existingLink = magicLinks[user.tg_id];
    if (existingLink) {
      setSelectedMagicLink(existingLink);
      setMagicLinkUser(user);
      return;
    }

    await generateMagicLink(user.tg_id, user);
  };

  if (loading) return <div style={{ color: '#a0a0a0' }}>Loading users...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="users-tab">
      <h2>User Management</h2>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table className="users-table">
          <tbody>
            {users.map(user => (
              <tr key={user.tg_id}>
                <td className="td-avatar">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="avatar"
                      className="user-avatar"
                      style={{ width: '32px', height: '32px', borderRadius: '10px' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/profile_picture.jpg';
                      }}
                      onClick={() => setSelectedUser(user)}
                    />
                  ) : (
                    <div className="user-avatar-placeholder">—</div>
                  )}
                </td>
                <td
                  className="td-displayname"
                  style={{ color: user.color || '#e0e0e0' }}
                >
                  {user.displayName || 'No name'}
                </td>
                <td className="td-magiclink">
                  <button
                    className="magiclink-btn"
                    onClick={() => openMagicLinkModal(user)}
                    disabled={generatingLink === user.tg_id}
                  >
                    {generatingLink === user.tg_id ? '...' : 'MagicLink'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* User Info Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Information</h3>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-row">
                <span className="info-label">Telegram ID:</span>
                <span className="info-value">{selectedUser.tg_id}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Display Name:</span>
                <span className="info-value" style={{ color: selectedUser.color || '#e0e0e0' }}>
                  {selectedUser.displayName || '—'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Username:</span>
                <span className="info-value">{selectedUser.username || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Color:</span>
                <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedUser.color && (
                    <div style={{
                      width: '20px',
                      height: '20px',
                      background: selectedUser.color,
                      borderRadius: '4px',
                      border: '1px solid #3a4255'
                    }} />
                  )}
                  {selectedUser.color || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Magic Link Modal */}
      {selectedMagicLink && (
        <div className="modal-overlay" onClick={() => setSelectedMagicLink(null)}>
          <div className="modal-content magiclink-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Magic Link</h3>
              <button className="modal-close" onClick={() => setSelectedMagicLink(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="magiclink-qr-wrap">
                <img
                  className="magiclink-qr"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(selectedMagicLink)}&color=16e0d0&bgcolor=08544e&margin=10&format=jpg&qzone=1`}
                  alt="Magic Link QR code"
                />
              </div>
              <div className="magiclink-copy-panel">
                <label className="magiclink-label">Scan QR or copy the link below</label>
                <div className="magiclink-url-row">
                  <input
                    type="text"
                    readOnly
                    value={selectedMagicLink}
                    className="magiclink-url"
                  />
                  <button
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedMagicLink);
                      alert('Copied to clipboard!');
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              {magicLinkUser && (
                <div className="magiclink-note">
                  Link for: <strong>{magicLinkUser.displayName || magicLinkUser.tg_id}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
