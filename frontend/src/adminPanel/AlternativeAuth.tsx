import { useState } from 'react';

const BACKEND_URL = (() => {
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && (window as any).__RUNTIME__ && (window as any).__RUNTIME__.VITE_API_BASE) {
      // @ts-ignore
      return (window as any).__RUNTIME__.VITE_API_BASE;
    }
  } catch (e) {}
  return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';
})();

interface UserCreationProps {
  password: string;
}

export default function UserCreation({ password }: UserCreationProps) {
  const [formData, setFormData] = useState({
    telegramId: '1000',
    displayName: '',
    color: '#0f9a8f',
    sex: 'Female',
    profilePictureIndex: '00',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreate = async () => {
    if (!formData.telegramId || !formData.displayName) {
      setError('Заполните все обязательные поля');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const newUser = {
        tg_id: formData.telegramId,
        telegramId: formData.telegramId,
        displayName: formData.displayName,
        firstName: formData.displayName,
        lastName: '',
        color: formData.color,
        sex: formData.sex,
        profilePicture: `/profile_pictures/profile_picture_${formData.profilePictureIndex}.jpg`,
        username: formData.telegramId,
      };

      const res = await fetch(`${BACKEND_URL}/admin/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          user: newUser
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessage(`✓ Пользователь ${formData.displayName} создан!`);
        setFormData({
          telegramId: String(parseInt(formData.telegramId) + 1),
          displayName: '',
          color: '#0f9a8f',
          sex: 'Female',
          profilePictureIndex: '00',
        });
      } else {
        setError(data.error || 'Ошибка создания пользователя');
      }
    } catch (e) {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-creation-tab">
      <h2>Создание пользователя</h2>
      
      <div className="form-group">
        <label>Telegram ID (по умолчанию 1000)</label>
        <input
          type="text"
          value={formData.telegramId}
          onChange={(e) => handleChange('telegramId', e.target.value)}
          placeholder="1000"
        />
      </div>

      <div className="form-group">
        <label>Имя *</label>
        <input
          type="text"
          value={formData.displayName}
          onChange={(e) => handleChange('displayName', e.target.value)}
          placeholder="Введите имя"
        />
      </div>

      <div className="form-group">
        <label>Цвет</label>
        <div className="color-input">
          <input
            type="color"
            value={formData.color}
            onChange={(e) => handleChange('color', e.target.value)}
          />
          <span className="color-value">{formData.color}</span>
        </div>
      </div>

      <div className="form-group">
        <label>Пол</label>
        <select
          value={formData.sex}
          onChange={(e) => handleChange('sex', e.target.value)}
        >
          <option value="Female">Female</option>
          <option value="Male">Male</option>
        </select>
      </div>

      <div className="form-group">
        <label>Аватар</label>
        <select
          value={formData.profilePictureIndex}
          onChange={(e) => handleChange('profilePictureIndex', e.target.value)}
        >
          <option value="00">profile_picture_00.jpg</option>
          <option value="01">profile_picture_01.jpg</option>
          <option value="02">profile_picture_02.jpg</option>
          <option value="03">profile_picture_03.jpg</option>
          <option value="04">profile_picture_04.jpg</option>
          <option value="05">profile_picture_05.jpg</option>
        </select>
      </div>

      {error && <div className="form-error">{error}</div>}
      {message && <div className="form-success">{message}</div>}

      <button
        className="create-btn"
        onClick={handleCreate}
        disabled={loading}
      >
        {loading ? 'Создание...' : '✓ Создать'}
      </button>
    </div>
  );
}
