const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Получить профиль пользователя
router.get('/:id', async (req, res) => {
  const tg_id = req.params.id;
  try {
    const userRef = admin.database().ref(`users/${tg_id}`);
    const snapshot = await userRef.once('value');
    const user = snapshot.val();
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

module.exports = router;
