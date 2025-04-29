const express = require('express');
const router = express.Router();
const pool = require('../db');

// Создание завещания
router.post('/', async (req, res) => {
  const { owner_id, recipient_email, recipient_full_name, container_name, unlock_date } = req.body;

  try {
    await pool.query(
      'INSERT INTO wills (owner, recipient, recipient_full_name, container_name, unlock_date) VALUES ($1, $2, $3, $4, $5)',
      [owner_id, recipient_email, recipient_full_name, container_name, unlock_date]
    );

    res.status(201).json({ message: 'Завещание создано' });
  } catch (err) {
    console.error('Ошибка при создании завещания:', err);
    res.status(500).json({ message: 'Ошибка сервера при создании завещания' });
  }
});

// Получение всех завещаний для пользователя
router.get('/:ethAddress', async (req, res) => {
  const { ethAddress } = req.params;

  try {
    const createdWills = await pool.query(
      'SELECT * FROM wills WHERE owner = $1',
      [ethAddress]
    );

    const receivedWills = await pool.query(
      'SELECT * FROM wills WHERE recipient = (SELECT email FROM users WHERE eth_address = $1)',
      [ethAddress]
    );

    res.json({
      created: createdWills.rows,
      received: receivedWills.rows,
    });
  } catch (err) {
    console.error('Ошибка при получении завещаний:', err);
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