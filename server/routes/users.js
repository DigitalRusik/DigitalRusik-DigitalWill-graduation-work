const express = require('express');
const router = express.Router();
const pool = require('../db');

// =====Проверка email пользователя=====
router.post('/check-email', async (req, res) => {
  const { email } = req.body;

  try {
    const result = await pool.query('SELECT first_name, last_name, patronymic FROM users WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const fullName = `${user.last_name} ${user.first_name} ${user.patronymic}`;
      res.json({ exists: true, fullName });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error('Ошибка при проверке почты:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});
  module.exports = router;