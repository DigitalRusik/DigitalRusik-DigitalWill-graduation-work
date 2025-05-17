const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const verifyToken = require('../verifyToken');

// Убедимся, что папка существует
const uploadDir = path.join(__dirname, '..', 'uploads', 'kyc');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const safeName = `user-${req.user.id}-${Date.now()}${ext}`;
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// =====Загрузка документов на верификацию=====
router.post('/upload', verifyToken, upload.single('document'), async (req, res) => {
  try {
    const userId = req.user.id;
    const filePath = path.join('uploads', 'kyc', req.file.filename);
        // Проверяем, есть ли уже необработанная заявка
    const pendingCheck = await pool.query(`
    SELECT * FROM kyc_requests WHERE user_id = $1 AND status = 'pending'
    `, [userId]);

    if (pendingCheck.rows.length > 0) {
    return res.status(400).json({ message: 'Заявка уже отправлена и ожидает рассмотрения' });
    }
    
    // Сохраняем запись о заявке
    await pool.query(
      `INSERT INTO kyc_requests (user_id, document_path, status)
       VALUES ($1, $2, 'pending')`,
      [userId, filePath]
    );

    res.status(200).json({ message: 'Документ отправлен на проверку' });
  } catch (err) {
    console.error('Ошибка при загрузке KYC:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// =====Получение всех KYC-заявок=====
router.get('/requests', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT kr.id, kr.user_id, kr.document_path, kr.status, u.email,
             u.first_name, u.last_name, u.patronymic
      FROM kyc_requests kr
      JOIN users u ON kr.user_id = u.id
      ORDER BY kr.submitted_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении заявок:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// =====Подтверждение заявки=====
router.post('/approve/:requestId', async (req, res) => {
  const { requestId } = req.params;
  try {
    const result = await pool.query(`
      UPDATE kyc_requests SET status = 'approved' WHERE id = $1 RETURNING user_id
    `, [requestId]);

    if (result.rowCount === 0) return res.status(404).json({ message: 'Заявка не найдена' });

    const userId = result.rows[0].user_id;

    await pool.query(
      `UPDATE users SET is_verified = true WHERE id = $1`,
      [userId]
    );

    res.json({ message: 'Заявка подтверждена' });
  } catch (err) {
    console.error('Ошибка при подтверждении заявки:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Отклонение заявки
router.post('/reject/:requestId', async (req, res) => {
  const { requestId } = req.params;
  try {
    const result = await pool.query(`
      UPDATE kyc_requests SET status = 'rejected' WHERE id = $1 RETURNING user_id
    `, [requestId]);

    if (result.rowCount === 0) return res.status(404).json({ message: 'Заявка не найдена' });

    res.json({ message: 'Заявка отклонена' });
  } catch (err) {
    console.error('Ошибка при отклонении заявки:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
