
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { checkTelegramAuth } = require('./telegram');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const app = express();
app.use(express.json());

// firebase helpers
const fb = require('./firebase');

// ChatAPI helper (router + helper)
const chatapi = require('./chatapi');

// Подключение profile.js, characters.js и classes.js
const profileRouter = require('./profile');
const charactersRouter = require('./characters');
const classesRouter = require('./classes');
const storyRouter = require('./routes/characterStory');

// CORS setup (must be before routes)
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : ['https://dnd.lumotarina.ru', 'http://localhost:5173'];
app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like curl, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('CORS policy: origin not allowed'), false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept']
}));

// Support preflight requests for all routes
app.options('*', cors());

app.use('/profile', profileRouter);
app.use('/characters', charactersRouter);
app.use('/classes', classesRouter);
app.use('/story', storyRouter);

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
const botModule = require('./bot');
sendLoginCode = botModule.sendLoginCode;
checkLoginCode = botModule.checkLoginCode;
if (botModule.isTelegramAvailable && botModule.isTelegramAvailable()) {
  console.log('Telegram bot started with backend');
} else {
  console.log('Telegram bot unavailable; proceeding without Telegram');
}
// Endpoint: отправить код в Telegram
app.post('/auth/send-code', express.json(), (req, res) => {
  const { tg_id } = req.body;
  if (!tg_id) return res.status(400).json({ success: false, error: 'tg_id required' });
  try {
    sendLoginCode(tg_id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Telegram unavailable' });
  }
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

// Endpoint: проверить доступность Telegram (для фронтенда)
app.get('/auth/telegram-status', (req, res) => {
  try {
    if (botModule && botModule.getTelegramStatus) {
      const st = botModule.getTelegramStatus();
      return res.json(st);
    }
    const available = !!(botModule && botModule.isTelegramAvailable && botModule.isTelegramAvailable());
    res.json({ available, lastErrorMessage: null, isConflict: false });
  } catch (e) {
    res.json({ available: false, lastErrorMessage: null, isConflict: false });
  }
});

// Endpoint: проверить пароль админ-панели
app.post('/admin/verify-password', express.json(), (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PANEL_PASSWORD || '';
  if (!adminPassword) {
    return res.status(500).json({ success: false, error: 'Admin password not configured' });
  }
  if (password === adminPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

// Endpoint: создать magic link JWT для конкретного пользователя (tg_id)
app.post('/admin/generate-magic-link', express.json(), (req, res) => {
  const { tg_id, password } = req.body;
  if (!password || !tg_id) {
    return res.status(400).json({ success: false, error: 'password and tg_id required' });
  }
  const adminPassword = process.env.ADMIN_PANEL_PASSWORD || '';
  if (password !== adminPassword) {
    return res.status(401).json({ success: false, error: 'Invalid admin password' });
  }
  try {
    // Generate JWT with 1-hour expiration
    const token = jwt.sign({ tg_id, type: 'magic_link' }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, token });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Token generation failed' });
  }
});

// Endpoint: fetch all users from Firebase
app.get('/admin/users', express.json(), async (req, res) => {
  const { password } = req.query;
  if (!password) {
    return res.status(401).json({ success: false, error: 'Admin password required' });
  }
  const adminPassword = process.env.ADMIN_PANEL_PASSWORD || '';
  if (password !== adminPassword) {
    return res.status(401).json({ success: false, error: 'Invalid admin password' });
  }
  try {
    const usersRef = admin.database().ref('users');
    const snapshot = await usersRef.once('value');
    const usersData = snapshot.val() || {};
    // Format as array of { tg_id, displayName, ... }
    const usersList = Object.entries(usersData).map(([tg_id, userData]) => ({
      tg_id,
      ...userData
    }));
    res.json({ success: true, users: usersList });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Endpoint: create new user
app.post('/admin/create-user', express.json(), async (req, res) => {
  const { password, user } = req.body;
  if (!password || !user) {
    return res.status(400).json({ success: false, error: 'Password and user data required' });
  }
  const adminPassword = process.env.ADMIN_PANEL_PASSWORD || '';
  if (password !== adminPassword) {
    return res.status(401).json({ success: false, error: 'Invalid admin password' });
  }
  try {
    const tg_id = user.tg_id || user.telegramId;
    if (!tg_id || !user.displayName) {
      return res.status(400).json({ success: false, error: 'Missing required fields (tg_id, displayName)' });
    }
    
    // Check if user already exists
    const existingUser = await admin.database().ref(`users/${tg_id}`).once('value');
    if (existingUser.exists()) {
      return res.status(409).json({ success: false, error: 'User with this ID already exists' });
    }

    // Create new user object
    const newUserData = {
      tg_id: tg_id,
      telegramId: tg_id,
      displayName: user.displayName,
      firstName: user.firstName || user.displayName,
      lastName: user.lastName || '',
      color: user.color || '#0f9a8f',
      sex: user.sex || 'Female',
      profilePicture: user.profilePicture || '/profile_pictures/profile_picture_00.jpg',
      username: user.username || tg_id,
      createdAt: new Date().toISOString(),
    };

    await admin.database().ref(`users/${tg_id}`).set(newUserData);
    res.json({ success: true, user: newUserData });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3111;
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

// Notes endpoints
app.get('/notes/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    let notes = await fb.listNotes(userId);
    // optional filtering by type or tag
    const { type, tag } = req.query;
    if (type) notes = notes.filter(n => n.type === type);
    if (tag) notes = notes.filter(n => (n.tags || []).includes(tag));
    res.json(notes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/notes/:userId/:noteId', async (req, res) => {
  const { userId, noteId } = req.params;
  try {
    const note = await fb.getNote(userId, noteId);
    if (!note) return res.status(404).json({ error: 'Not found' });
    res.json(note);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/notes/:userId', async (req, res) => {
  const userId = req.params.userId; const body = req.body || {};
  try {
    const note = await fb.createNote(userId, body);
    res.status(201).json(note);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/notes/:userId/:noteId', async (req, res) => {
  const { userId, noteId } = req.params; const body = req.body || {};
  try {
    const updated = await fb.updateNote(userId, noteId, body);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/notes/:userId/:noteId', async (req, res) => {
  const { userId, noteId } = req.params;
  try { await fb.deleteNote(userId, noteId); res.json({ success:true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// Tag endpoints
app.get('/note_tags/:userId', async (req, res) => {
  const userId = req.params.userId;
  try { const tags = await fb.listTags(userId); res.json(tags); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/note_tags/:userId', async (req, res) => {
  const userId = req.params.userId; const body = req.body || {};
  try { const t = await fb.createTag(userId, body); res.status(201).json(t); } catch (e) { res.status(500).json({ error: e.message }); }
});

// Endpoint: получить displayName пользователя по id (используется в MasterRoom)
app.get('/users/:id/displayName', async (req, res) => {
  const id = req.params.id;
  try {
    const nameRef = admin.database().ref(`users/${id}/displayName`);
    const snap = await nameRef.once('value');
    const displayName = snap.val() || 'Игрок';
    res.json({ displayName });
  } catch (err) {
    console.error('GET /users/:id/displayName error', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: проверить, является ли пользователь мастером (MASTERS env)
app.get('/auth/is_master/:id', (req, res) => {
  const id = String(req.params.id || '');
  try {
    const raw = process.env.MASTERS || process.env.MASTERS_LIST || '';
    let masters = [];
    if (!raw) {
      masters = [];
    } else {
      try {
        masters = JSON.parse(raw);
      } catch (e) {
        masters = String(raw).split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    const isMaster = masters.map(String).includes(id);
    res.json({ isMaster: !!isMaster });
  } catch (e) {
    console.error('GET /auth/is_master error', e);
    res.status(500).json({ error: e.message });
  }
});

// Выводим все маршруты приложения
function listAllRoutes(app) {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods)
        .map((m) => m.toUpperCase())
        .join(', ');
      routes.push(`${methods} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods)
            .map((m) => m.toUpperCase())
            .join(', ');
          routes.push(`${methods} ${middleware.regexp}${handler.route.path}`);
        }
      });
    }
  });
  return routes;
}

function cleanRoutes(app) {
  const routes = listAllRoutes(app);
  return routes.map(r => {
    // r = "GET /^\\/profile\\/?(?=\\/|$)/i/:id"
    // убираем regex-мусор
    return r.replace(/\/\^\\/, '/')
            .replace(/\\\/\?\(\?=\\\/\|\$\)\/i/g, '')
            .replace(/\/\$/, '');
  });
}

app.get('/help', (req, res) => {
  const routes = listAllRoutes(app)
    .map(r => r.replace(/\/\^\\/, '/')
               .replace(/\\\/\?\(\?=\\\/\|\$\)\/i/g, '')
               .replace(/\/\$/, ''));
  res.type('text/plain');      // возвращаем как текст
  res.send(routes.join('\n')); // соединяем переносами
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

// Mount chatapi router (handles POST /chatapi)
app.use('/chatapi', express.json(), chatapi.router);

app.listen(PORT, IP, () => {
  console.log(`Server listening on http://${IP}:${PORT}`);
});
