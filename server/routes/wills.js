const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../verifyToken');

// =====Создание завещания=====
router.post('/', verifyToken, async (req, res) => {
  const { recipient, containerId, unlockTime, recipientFullName, contractWillId } = req.body;

  if (!recipient || !containerId || !unlockTime || contractWillId == null) {
    return res.status(400).json({ message: 'Не все поля заполнены или нет contractWillId' });
  }

  try {
    // Получаем данные пользователя (владельца завещания)
    const userRes = await pool.query(
      'SELECT eth_address FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const owner = userRes.rows[0].eth_address;

    // Получаем имя контейнера (data_hash)
    const containerRes = await pool.query(
      'SELECT name FROM containers WHERE id = $1',
      [containerId]
    );

    if (containerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Контейнер не найден' });
    }

    const dataHash = containerRes.rows[0].name;

    // Сохраняем завещание
    const result = await pool.query(
      `INSERT INTO wills (owner, recipient, data_hash, unlock_time, recipient_full_name, container_id, contract_will_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [owner, recipient, dataHash, unlockTime, recipientFullName || null, containerId, contractWillId]
    );

    res.status(201).json({ message: 'Завещание успешно создано', will: result.rows[0] });
  } catch (err) {
    console.error('Ошибка создания завещания:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});


// =====Получение всех завещаний для пользователя=====
router.get('/myWills', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Получаем email, eth_address и ФИО пользователя
    const result = await pool.query(
      'SELECT email, eth_address, first_name, last_name, patronymic FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const { email, eth_address, first_name, last_name, patronymic } = result.rows[0];
    const fullName = `${last_name} ${first_name} ${patronymic}`.trim().toLowerCase();

    // Получение завещаний, созданных пользователем
    const sent = await pool.query(
      `SELECT w.*, w.recipient_full_name AS recipient_name
      FROM wills w
      WHERE w.owner = $1
      ORDER BY w.created_at DESC`,
      [eth_address]
    );

    // Получение завещаний на имя пользователя
    const receivedRes = await pool.query(
      `SELECT w.*, u1.last_name || ' ' || u1.first_name || ' ' || u1.patronymic AS owner_name
      FROM wills w
      LEFT JOIN users u1 ON w.owner = u1.eth_address
      WHERE w.recipient = $1
      ORDER BY w.created_at DESC`,
      [email]
    );

    const filteredReceived = receivedRes.rows.filter(will => {
      if (!will.recipient_full_name) return true;
      return will.recipient_full_name.trim().toLowerCase() === fullName;
    });

    res.json({
      sent: sent.rows,
      received: filteredReceived,
    });
  } catch (err) {
    console.error('Ошибка при получении завещаний:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});


// =====Получение файлов контейнера=====
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