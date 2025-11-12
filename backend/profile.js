const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  setUserProfile,
  updateUserProfile,
  deleteUserProfile,
} = require('./firebase');
const admin = require('firebase-admin');

// Получить профиль пользователя
router.get('/:id', async (req, res) => {
  const tg_id = req.params.id;
  try {
    const user = await getUserProfile(tg_id);
    if (!user) {
      return res.json({
        displayName: 'Новый пользователь',
        color: '#888',
        profilePicture: '/profile_picture.jpg',
        achievements: [],
        lucoins: 0,
        role: 'user',
        stats: {},
        subscriptions: [],
        subscribers: [],
        username: '',
      });
    }
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Создать или полностью заменить профиль пользователя
router.post('/:id', express.json(), async (req, res) => {
  const tg_id = req.params.id;
  const profileData = req.body;
  try {
    await setUserProfile(tg_id, profileData);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Частичное обновление профиля пользователя
router.patch('/:id', express.json(), async (req, res) => {
  const tg_id = req.params.id;
  const updateData = req.body;
  try {
    await updateUserProfile(tg_id, updateData);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Удалить профиль пользователя
router.delete('/:id', async (req, res) => {
  const tg_id = req.params.id;
  try {
    await deleteUserProfile(tg_id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Создать персонажа для пользователя: POST /profile/:id/characters
router.post('/:id/characters', express.json(), async (req, res) => {
  const tg_id = req.params.id;
  const charData = req.body;
  try {
    const charsRef = admin.database().ref(`users/${tg_id}/characters`);
    const newRef = await charsRef.push(charData);
    res.json({ success: true, id: newRef.key });
  } catch (e) {
    console.error('create character error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
