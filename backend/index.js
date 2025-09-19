
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { checkTelegramAuth } = require('./telegram');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const app = express();

// Подключение profile.js и characters.js
const profileRouter = require('./profile');
const charactersRouter = require('./characters');

// CORS setup (должен быть до всех маршрутов!)
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
}));

app.use('/profile', profileRouter);
app.use('/characters', charactersRouter);

// Endpoint: получить публичные данные пользователя по tg_id
app.get('/auth/user/:id', async (req, res) => {
  const tg_id = req.params.id;
  try {
    const userRef = admin.database().ref(`users/${tg_id}`);
    const snapshot = await userRef.once('value');
    const user = snapshot.val();
    if (!user) {
      return res.json({
        displayName: 'Новый пользователь',
        color: '#888',
        profilePicture: '/profile_picture.jpg'
      });
    }
    const { displayName, color, profilePicture } = user;
    res.json({ displayName, color, profilePicture });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint для входа по одноразовой ссылке (JWT)
app.post('/auth/token', express.json(), (req, res) => {
  const { token } = req.body;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Здесь можно создать сессию или выдать новый JWT для фронта
    res.json({ success: true, user: payload });
  } catch (e) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});
// Запуск Telegram-бота вместе с backend и экспорт функций для кода
let sendLoginCode, checkLoginCode;
try {
  const botModule = require('./bot');
  sendLoginCode = botModule.sendLoginCode;
  checkLoginCode = botModule.checkLoginCode;
  console.log('Telegram bot started with backend');
} catch (e) {
  console.error('Telegram bot failed to start:', e);
}
// Endpoint: отправить код в Telegram
app.post('/auth/send-code', express.json(), (req, res) => {
  const { tg_id } = req.body;
  if (!tg_id) return res.status(400).json({ success: false, error: 'tg_id required' });
  sendLoginCode(tg_id);
  res.json({ success: true });
});

// Endpoint: проверить код
app.post('/auth/check-code', express.json(), (req, res) => {
  const { tg_id, code } = req.body;
  if (!tg_id || !code) return res.status(400).json({ success: false, error: 'tg_id and code required' });
  const ok = checkLoginCode(tg_id, code);
  res.json({ success: ok });
});
// Endpoint для авторизации через Telegram WebApp
app.post('/auth/telegram', express.json(), (req, res) => {
  const isValid = checkTelegramAuth(req.body, process.env.TELEGRAM_BOT_TOKEN);
  if (isValid) {
    // Здесь можно создать сессию или JWT для пользователя
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid Telegram auth' });
  }
});

const PORT = process.env.PORT || 3001;
const IP = "0.0.0.0";



app.get('/users', async (req, res) => {
  try {
    const usersRef = admin.database().ref('users');
    const snapshot = await usersRef.once('value');
    res.json(snapshot.val());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Firebase Admin SDK init
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

app.get('/', (req, res) => {
  res.send('Backend is running and connected to Firebase!');
});

app.listen(PORT, IP, () => {
  console.log(`Server listening on http://${IP}:${PORT}`);
});
