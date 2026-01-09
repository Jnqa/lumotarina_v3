const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// GET /classes/:name - получить данные класса по имени
router.get('/:name', (req, res) => {
  const className = req.params.name;
  const filePath = path.join(__dirname, 'characters', 'classes', `${className}.json`);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Cannot read file for class ${className}:`, err);
      return res.status(404).json({ error: `Class ${className} not found` });
    }
    try {
      const json = JSON.parse(data);
      res.json(json);
    } catch (e) {
      console.error(`Invalid JSON in ${className}.json:`, e);
      res.status(500).json({ error: 'Invalid JSON' });
    }
  });
});

module.exports = router;