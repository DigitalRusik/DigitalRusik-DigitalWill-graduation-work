const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ethers } = require('ethers');



router.post('/register', async (req, res) => {
  const { firstName, lastName, patronymic, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Генерация Ethereum аккаунта
    const wallet = ethers.Wallet.createRandom();
    const ethAddress = wallet.address;
    const privateKey = wallet.privateKey;

    // Генерация ключа шифрования 
    const encryptionKey = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, patronymic, email, password, eth_address, private_key, encryption_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, eth_address`,
      [firstName, lastName, patronymic, email, hashedPassword, ethAddress, privateKey, encryptionKey]
    );

    res.status(201).json({ message: 'Пользователь зарегистрирован', user: result.rows[0]});
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    } else {
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }
});

const { generateToken } = require("../utils/jwt");

// =====Авторизация=====
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }

    const token = generateToken({ id: user.id, email: user.email });
    res.json({
      message: 'Вход выполнен',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: `${user.last_name} ${user.first_name} ${user.patronymic}`
      },
      //ethAddress: user.eth_address
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// =====Получение всех пользователей=====
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, patronymic, email, eth_address FROM users'
    );

    const users = result.rows.map(user => ({
      id: user.id,
      fullName: `${user.last_name} ${user.first_name} ${user.patronymic || ''}`.trim(),
      email: user.email,
      eth_address: user.eth_address
    }));

    res.json(users);
  } catch (err) {
    console.error('Ошибка при получении пользователей:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// =====Проверка статуса подтверждения пользователя=====
router.get('/status/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const result = await pool.query(
      'SELECT is_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json({ isVerified: result.rows[0].is_verified });
  } catch (err) {
    console.error('Ошибка получения статуса подтверждения:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;