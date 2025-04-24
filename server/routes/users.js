const express = require('express');
const router = express.Router();
const pool = require('../db');

// Проверка email пользователя
router.post('/check-email', async (req, res) => {
    const { email } = req.body;
  
    try {
      const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  
      res.json({ exists: result.rows.length > 0 });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });
  module.exports = router;