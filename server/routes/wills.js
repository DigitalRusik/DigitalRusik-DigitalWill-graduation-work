const express = require('express');
const router = express.Router();
const pool = require('../db');

// Создание завещания
router.post('/', async (req, res) => {
  const { owner, recipient, dataHash, unlockTime, recipientFullName } = req.body;

  if (!owner || !recipient || !dataHash || !unlockTime) {
    return res.status(400).json({ message: 'Не все поля заполнены' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO wills (owner, recipient, data_hash, unlock_time, recipient_full_name) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [owner, recipient, dataHash, unlockTime, recipientFullName || null]
    );

    res.status(201).json({ message: 'Завещание успешно создано', will: result.rows[0] });
  } catch (err) {
    console.error('Ошибка создания завещания:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить завещания, созданные пользователем
router.get('/created/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM wills WHERE owner = (SELECT eth_address FROM users WHERE id = $1)', [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении созданных завещаний:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить завещания, оставленные пользователю
router.get('/received/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const result = await pool.query('SELECT * FROM wills WHERE recipient = $1', [email]);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении завещаний на пользователя:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение файлов контейнера
router.get('/by-name/:name', async (req, res) => {
  const { name } = req.params;

  try {
    const result = await pool.query('SELECT * FROM containers WHERE name = $1', [name]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Контейнер не найден' });
    }

    const files = JSON.parse(result.rows[0].file_path).map(f => ({
      name: f.name,
      container_id: result.rows[0].id
    }));

    res.json({ files });
  } catch (err) {
    console.error('Ошибка при поиске контейнера по названию:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;