const express = require('express');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const router = express.Router();

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
    res.status(500).json({ error: 'Server error' });
  }
});

// Создать нового персонажа
router.post('/user/:id', async (req, res) => {
  const tg_id = req.params.id;
  const character = req.body;
  try {
    const charsRef = admin.database().ref(`characters/${tg_id}`);
    const newCharRef = charsRef.push();
    await newCharRef.set(character);
    res.json({ success: true, id: newCharRef.key });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
