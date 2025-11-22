const express = require('express');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const router = express.Router();

// ensure JSON bodies are parsed for these routes
router.use(express.json());

// Получить список классов из JSON
router.get('/classes', (req, res) => {
  const filePath = path.join(__dirname, 'characters', 'classes.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Cannot read classes.json' });
    try {
      res.json(JSON.parse(data));
    } catch (e) {
      res.status(500).json({ error: 'Invalid JSON' });
    }
  });
});

// Получить персонажей пользователя
router.get('/user/:id', async (req, res) => {
  const tg_id = req.params.id;
  try {
    const charsRef = admin.database().ref(`characters/${tg_id}`);
    const snapshot = await charsRef.once('value');
    res.json(snapshot.val() || []);
  } catch (e) {
    console.error('GET /characters/user/:id error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить одного персонажа
router.get('/user/:id/:charId', async (req, res) => {
  const tg_id = req.params.id;
  const charId = req.params.charId;
  try {
    const charRef = admin.database().ref(`characters/${tg_id}/${charId}`);
    const snap = await charRef.once('value');
    const data = snap.val();
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e) {
    console.error('GET /characters/user/:id/:charId error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить список всех персонажей во всей БД (ownerId, charId, name, picture)
// WARNING: may return large payload on big DBs; used by master-room for selecting players
router.get('/list', async (req, res) => {
  try {
    // Read users once to map ownerId -> displayName
    const usersRef = admin.database().ref('users');
    const usersSnap = await usersRef.once('value');
    const users = usersSnap.val() || {};

    const rootRef = admin.database().ref('characters');
    const snap = await rootRef.once('value');
    const out = [];
    const defaultPic = 'profile_picture_00.jpg';
    snap.forEach(userSnap => {
      const userId = userSnap.key;
      const chars = userSnap.val();
      if (!chars) return;
      const ownerDisplayName = (users[userId] && users[userId].displayName) ? users[userId].displayName : 'Игрок';
      Object.keys(chars).forEach(charId => {
        const ch = chars[charId];
        if (!ch) return;
        out.push({
          ownerId: userId,
          ownerDisplayName,
          charId: charId,
          name: ch.name || ch.title || `char_${charId}`,
          picture: ch.picture || defaultPic,
        });
      });
    });
    res.json(out);
  } catch (e) {
    console.error('GET /characters/list error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Создать нового персонажа
router.post('/user/:id', async (req, res) => {
  const tg_id = req.params.id;
  const character = req.body;
  console.log('POST /characters/user/:id incoming body:', JSON.stringify(character));
  try {
    const charsRef = admin.database().ref(`characters/${tg_id}`);
    // Use a transaction-safe counter to allocate sequential numeric IDs under `counters/characters/<tg_id>`.
    const counterRef = admin.database().ref(`counters/characters/${tg_id}`);
    const counterResult = await counterRef.transaction(current => {
      return (current === null ? 0 : current + 1);
    });
    if (!counterResult.committed) {
      throw new Error('Failed to allocate numeric id for new character');
    }
    const newId = String(counterResult.snapshot.val());
    const newCharRef = charsRef.child(newId);
    await newCharRef.set(character);
    console.log(`Created character for ${tg_id} with id ${newId}`);
    res.json({ success: true, id: newId });
  } catch (e) {
    console.error('POST /characters/user/:id error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Обновить существующего персонажа
router.put('/user/:id/:charId', async (req, res) => {
  const tg_id = req.params.id;
  const charId = req.params.charId;
  const update = req.body;
  try {
    const charRef = admin.database().ref(`characters/${tg_id}/${charId}`);
    await charRef.update(update);
    res.json({ success: true });
  } catch (e) {
    console.error('PUT /characters/user/:id/:charId error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Удалить персонажа
router.delete('/user/:id/:charId', async (req, res) => {
  const tg_id = req.params.id;
  const charId = req.params.charId;
  try {
    const charRef = admin.database().ref(`characters/${tg_id}/${charId}`);
    await charRef.remove();
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /characters/user/:id/:charId error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Добавить предмет в инвентарь персонажа
router.post('/user/:id/:charId/inventory', async (req, res) => {
  const tg_id = req.params.id;
  const charId = req.params.charId;
  const { item } = req.body;
  if (!item) return res.status(400).json({ error: 'Item is required' });
  try {
    const charRef = admin.database().ref(`characters/${tg_id}/${charId}`);
    await charRef.transaction(current => {
      if (!current) return current;
      const inv = Array.isArray(current.inventory) ? [...current.inventory] : [];
      inv.push(item);
      return { ...current, inventory: inv };
    });
    res.json({ success: true });
  } catch (e) {
    console.error('POST /characters/user/:id/:charId/inventory error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Alias: POST /items -> same as /inventory (keeps compatibility with frontend calls)
router.post('/user/:id/:charId/items', async (req, res) => {
  const tg_id = req.params.id;
  const charId = req.params.charId;
  const { item } = req.body;
  if (!item) return res.status(400).json({ error: 'Item is required' });
  try {
    const charRef = admin.database().ref(`characters/${tg_id}/${charId}`);
    await charRef.transaction(current => {
      if (!current) return current;
      const inv = Array.isArray(current.inventory) ? [...current.inventory] : [];
      inv.push(item);
      return { ...current, inventory: inv };
    });
    res.json({ success: true });
  } catch (e) {
    console.error('POST /characters/user/:id/:charId/items error', e);
    res.status(500).json({ error: 'Server error' });
  }
});
// Получить список предметов (inventory) персонажа — для отладки
router.get('/user/:id/:charId/items', async (req, res) => {
  const tg_id = req.params.id;
  const charId = req.params.charId;
  try {
    const invRef = admin.database().ref(`characters/${tg_id}/${charId}/inventory`);
    const snap = await invRef.once('value');
    const inv = snap.val();
    // Возвращаем пустой массив, если инвентарь не задан
    res.json(Array.isArray(inv) ? inv : []);
  } catch (e) {
    console.error('GET /characters/user/:id/:charId/items error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Удалить предмет по индексу из инвентаря персонажа
router.delete('/user/:id/:charId/inventory/:index', async (req, res) => {
  const tg_id = req.params.id;
  const charId = req.params.charId;
  const index = parseInt(req.params.index, 10);
  if (isNaN(index)) return res.status(400).json({ error: 'Invalid index' });
  try {
    const charRef = admin.database().ref(`characters/${tg_id}/${charId}`);
    await charRef.transaction(current => {
      if (!current) return current;
      const inv = Array.isArray(current.inventory) ? [...current.inventory] : [];
      if (index < 0 || index >= inv.length) return current;
      inv.splice(index, 1);
      return { ...current, inventory: inv };
    });
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /characters/user/:id/:charId/inventory/:index error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Alias: DELETE /items/:index -> same as /inventory/:index (compatibility)
router.delete('/user/:id/:charId/items/:index', async (req, res) => {
  const tg_id = req.params.id;
  const charId = req.params.charId;
  const index = parseInt(req.params.index, 10);
  if (isNaN(index)) return res.status(400).json({ error: 'Invalid index' });
  try {
    const charRef = admin.database().ref(`characters/${tg_id}/${charId}`);
    await charRef.transaction(current => {
      if (!current) return current;
      const inv = Array.isArray(current.inventory) ? [...current.inventory] : [];
      if (index < 0 || index >= inv.length) return current;
      inv.splice(index, 1);
      return { ...current, inventory: inv };
    });
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /characters/user/:id/:charId/items/:index error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить/обновить заметку персонажа
router.get('/user/:id/:charId/note', async (req, res) => {
  const tg_id = req.params.id;
  const charId = req.params.charId;
  try {
    const noteRef = admin.database().ref(`characters/${tg_id}/${charId}/note`);
    const snap = await noteRef.once('value');
    const note = snap.val();
    res.json({ note: note || '' });
  } catch (e) {
    console.error('GET /characters/user/:id/:charId/note error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/user/:id/:charId/note', async (req, res) => {
  const tg_id = req.params.id;
  const charId = req.params.charId;
  const { note } = req.body;
  // note can be empty string; normalize to string
  try {
    const charRef = admin.database().ref(`characters/${tg_id}/${charId}`);
    await charRef.transaction(current => {
      if (!current) return current;
      return { ...current, note: typeof note === 'string' ? note : '' };
    });
    res.json({ success: true });
  } catch (e) {
    console.error('POST /characters/user/:id/:charId/note error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить/обновить изображение персонажа
router.get('/user/:id/:charId/picture', async (req, res) => {
  const tg_id = req.params.id;
  const charId = req.params.charId;
  try {
    const picRef = admin.database().ref(`characters/${tg_id}/${charId}/picture`);
    const snap = await picRef.once('value');
    const picture = snap.val();
    res.json({ picture: picture || 'profile_picture_00.jpg' });
  } catch (e) {
    console.error('GET /characters/user/:id/:charId/picture error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/user/:id/:charId/picture', async (req, res) => {
  const tg_id = req.params.id;
  const charId = req.params.charId;
  const { picture } = req.body;
  try {
    const charRef = admin.database().ref(`characters/${tg_id}/${charId}`);
    await charRef.transaction(current => {
      if (!current) return current;
      return { ...current, picture: typeof picture === 'string' ? picture : 'profile_picture_00.jpg' };
    });
    res.json({ success: true });
  } catch (e) {
    console.error('POST /characters/user/:id/:charId/picture error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

