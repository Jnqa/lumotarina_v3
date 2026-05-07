const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

/**
 * S3/Storage helper for Lore content
 * Backend acts as proxy to avoid CORS issues
 */

// Base S3 URL from environment
const S3_BASE_URL = process.env.S3_BASE_URL || 'https://7871309f-1cc3-4e52-b3e7-0092c8fa743f.selstorage.ru';
const S3_LORE_PATH = '/lore/stories';

/**
 * GET /get-lore/books_list
 * Returns books list JSON (fetched from S3)
 */
router.get('/books_list', async (req, res) => {
  try {
    const url = `${S3_BASE_URL}${S3_LORE_PATH}/books_list.json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        success: false, 
        error: `S3 returned ${response.status}` 
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch books_list:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /get-lore/book/:bookId
 * Returns specific book.json (fetched from S3)
 */
router.get('/book/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    if (!bookId) {
      return res.status(400).json({ success: false, error: 'bookId required' });
    }
    
    // Map bookId to folder name
    const bookFolderMap = {
      'judy-liu-stories': 'Judy_Lu'
      // Add more mappings as needed
    };
    
    const folderName = bookFolderMap[bookId] || bookId;
    const url = `${S3_BASE_URL}${S3_LORE_PATH}/${folderName}/book.json`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        success: false, 
        error: `S3 returned ${response.status}` 
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch book:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /get-lore/chapter/:bookId/:chapterId
 * Returns chapter content (fetched from S3)
 */
router.get('/chapter/:bookId/:chapterId', async (req, res) => {
  try {
    const { bookId, chapterId } = req.params;
    if (!bookId || !chapterId) {
      return res.status(400).json({ 
        success: false, 
        error: 'bookId and chapterId required' 
      });
    }
    
    const bookFolderMap = {
      'judy-liu-stories': 'Judy_Lu'
    };
    
    const folderName = bookFolderMap[bookId] || bookId;
    const url = `${S3_BASE_URL}${S3_LORE_PATH}/${folderName}/${chapterId}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        success: false, 
        error: `S3 returned ${response.status}` 
      });
    }
    
    const text = await response.text();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(text);
  } catch (err) {
    console.error('Failed to fetch chapter:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
