const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');

// Регистрация
router.post('/register', async (req, res) => {
  const { firstName, lastName, patronymic, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (first_name, last_name, patronymic, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [firstName, lastName, patronymic, email, hashedPassword]
    );

    res.status(201).json({ message: 'Пользователь зарегистрирован', userId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    } else {
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }
});

module.exports = router;

// Авторизация
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    res.json({
      message: 'Вход выполнен',
      id: user.id,
      email: user.email,
      fullName: `${user.last_name} ${user.first_name} ${user.patronymic}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});