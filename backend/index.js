
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const { checkTelegramAuth } = require('./telegram');
const jwt = require('jsonwebtoken');
const { requireAuth } = require('./auth');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const app = express();
app.use(express.json());
app.use(cookieParser());

// firebase helpers
const fb = require('./firebase');

// ChatAPI helper (router + helper)
const chatapi = require('./chatapi');

// Подключение profile.js, characters.js и classes.js
const profileRouter = require('./profile');
const charactersRouter = require('./characters');
const classesRouter = require('./classes');
const storyRouter = require('./routes/characterStory');
const s3LoreRouter = require('./routes/s3Lore');

// CORS setup (must be before routes)
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) 
  : ['https://dnd.lumotarina.ru', 'http://localhost:5173', 'http://localhost:5174'];

const isDev = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: function(origin, callback) {
    // In development, allow all localhost origins
    if (isDev && origin && origin.includes('localhost')) {
      return callback(null, true);
    }
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

// ============ ROUTERS ============

app.use('/profile', profileRouter);
app.use('/characters', charactersRouter);
app.use('/classes', classesRouter);
app.use('/story', storyRouter);
app.use('/get-lore', s3LoreRouter);

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
    // Создаём новый JWT для cookie
    const sessionToken = jwt.sign({ tgId: payload.tg_id }, JWT_SECRET, { expiresIn: '30d' });
    
    res.cookie('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({ success: true, user: { tgId: payload.tg_id } });
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

// Endpoint: проверить код и установить httpOnly cookie с JWT
app.post('/auth/check-code', express.json(), (req, res) => {
  const { tg_id, code } = req.body;
  if (!tg_id || !code) return res.status(400).json({ success: false, error: 'tg_id and code required' });
  
  const ok = checkLoginCode(tg_id, code);
  if (!ok) {
    return res.status(401).json({ success: false, error: 'Invalid or expired code' });
  }

  // Создаём JWT и устанавливаем в httpOnly cookie
  const token = jwt.sign({ tgId: tg_id }, JWT_SECRET, { expiresIn: '30d' });
  
  res.cookie('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // только HTTPS в продакшене
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
    path: '/'
  });

  res.json({ success: true });
});
// Endpoint для авторизации через Telegram WebApp (DISABLED)
app.post('/auth/telegram', express.json(), (req, res) => {
  res.status(501).json({ success: false, error: 'Telegram authentication is disabled' });
});

// Endpoint: проверить доступность Telegram (для фронтенда) (DISABLED)
app.get('/auth/telegram-status', (req, res) => {
  res.json({ available: false, reason: 'Telegram authentication is disabled' });
});

// Endpoint: проверить текущую сессию
app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Endpoint: узнать, есть ли у текущего пользователя пароль (не возвращаем hash)
app.get('/auth/has-password', requireAuth, async (req, res) => {
  try {
    const tgId = req.user.tgId;
    const userRef = admin.database().ref(`users/${tgId}`);
    const snapshot = await userRef.once('value');
    const user = snapshot.val() || {};
    res.json({ success: true, hasPassword: !!user.passwordHash });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Endpoint: изменить пароль текущего пользователя (без раскрытия хеша)
app.post('/auth/change-password', express.json(), requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ success: false, error: 'newPassword required' });
  try {
    const tgId = req.user.tgId;
    const userRef = admin.database().ref(`users/${tgId}`);
    const snapshot = await userRef.once('value');
    const user = snapshot.val() || {};

    // If user already has a password, require oldPassword and verify it
    if (user.passwordHash) {
      if (!oldPassword) return res.status(400).json({ success: false, error: 'oldPassword required' });
      const ok = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!ok) return res.status(401).json({ success: false, error: 'Invalid old password' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await admin.database().ref(`users/${tgId}`).update({ passwordHash: newHash });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Endpoint: выход (logout)
app.post('/auth/logout', (req, res) => {
  res.clearCookie('session', { path: '/' });
  res.json({ success: true });
});

// Endpoint: вход по username и password (требует хеша пароля в БД)
app.post('/auth/login-password', express.json(), async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }

  try {
    // Ищем пользователя по username
    const usersRef = admin.database().ref('users');
    const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');
    
    if (!snapshot.exists()) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const usersData = snapshot.val();
    const tgId = Object.keys(usersData)[0];
    const userData = usersData[tgId];

    // Проверяем пароль
    if (!userData.passwordHash) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const isValidPassword = await bcrypt.compare(password, userData.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    // Создаём JWT и устанавливаем в httpOnly cookie
    const token = jwt.sign({ tgId }, JWT_SECRET, { expiresIn: '30d' });
    
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server error' });
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

// Endpoint: установить пароль для пользователя (для скрипта и админа)
app.post('/admin/set-password', express.json(), async (req, res) => {
  const { adminPassword, username, newPassword } = req.body;
  
  if (!adminPassword || !username || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      error: 'adminPassword, username, and newPassword required' 
    });
  }

  const ADMIN_PASS = process.env.ADMIN_PANEL_PASSWORD || '';
  if (adminPassword !== ADMIN_PASS) {
    return res.status(401).json({ success: false, error: 'Invalid admin password' });
  }

  try {
    // Ищем пользователя по username
    const usersRef = admin.database().ref('users');
    const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, error: `User with username "${username}" not found` });
    }

    const usersData = snapshot.val();
    const tgId = Object.keys(usersData)[0];
    const userData = usersData[tgId];

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Обновляем в БД
    await admin.database().ref(`users/${tgId}`).update({ passwordHash });
    
    res.json({ 
      success: true, 
      message: `Password set for user "${username}" (tgId: ${tgId})` 
    });
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

// Endpoint: проверить, является ли пользователь админом (ADMINS env)
app.get('/auth/is_admin/:id', (req, res) => {
  const id = String(req.params.id || '');
  try {
    const raw = process.env.ADMINS || process.env.ADMINS_LIST || '';
    let admins = [];
    if (!raw) {
      admins = [];
    } else {
      try {
        admins = JSON.parse(raw);
      } catch (e) {
        admins = String(raw).split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    const isAdmin = admins.map(String).includes(id);
    res.json({ isAdmin: !!isAdmin });
  } catch (e) {
    console.error('GET /auth/is_admin error', e);
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
