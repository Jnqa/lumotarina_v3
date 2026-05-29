import { useEffect, useState } from 'react';
import { showToast } from '../../utils/toast';

const API_BASE = (() => {
  try {
    const rt = (window as any).__RUNTIME__;
    if (rt?.VITE_API_BASE) return rt.VITE_API_BASE;
  } catch {}
  return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';
})();

export default function SettingsModal({ onClose }: { onClose: () => void }) {
	const [hasPassword, setHasPassword] = useState<boolean | null>(null);
	const [oldPassword, setOldPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 5000);
				const r = await fetch(`${API_BASE}/auth/has-password`, { 
					credentials: 'include',
					signal: controller.signal
				});
				clearTimeout(timeoutId);
				if (!r.ok) { setHasPassword(null); return; }
				const text = await r.text();
				let j: any;
				try { j = JSON.parse(text); } catch (err) {
					console.error('Error parsing JSON from /auth/has-password:', text, err);
					setHasPassword(null);
					return;
				}
				setHasPassword(!!j?.hasPassword);
			} catch (e) { 
				console.error('Error checking password:', e);
				setHasPassword(null);
			}
		})();
	}, []);

	async function handleSubmit() {
		if (!newPassword) { showToast('Введите новый пароль', { type: 'error' }); return; }
		if (newPassword !== confirm) { showToast('Пароли не совпадают', { type: 'error' }); return; }
		setLoading(true);
		try {
			const body: any = { newPassword };
			if (hasPassword) body.oldPassword = oldPassword;
			const r = await fetch(`${API_BASE}/auth/change-password`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
			const j = await r.json().catch(() => ({}));
			if (r.ok && j?.success !== false) {
				showToast('Пароль обновлён', { type: 'success' });
				onClose();
			} else {
				showToast(j?.error || 'Ошибка при обновлении пароля', { type: 'error' });
			}
		} catch (e) {
			showToast('Ошибка соединения', { type: 'error' });
		} finally { setLoading(false); }
	}

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
				<h3>Изменить пароль</h3>
				{hasPassword === null ? (
					<div>Проверяем учётную запись...</div>
				) : (
					<div>
						{hasPassword && (
							<div>
								<label>Старый пароль</label>
								<input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
							</div>
						)}
						<div>
							<label>Новый пароль</label>
							<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
						</div>
						<div>
							<label>Подтвердите новый пароль</label>
							<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
						</div>
						<div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
							<button onClick={onClose} disabled={loading}>Отмена</button>
							<button onClick={handleSubmit} disabled={loading}>{loading ? 'Сек...' : 'Сохранить'}</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
