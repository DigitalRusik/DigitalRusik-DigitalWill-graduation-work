const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../db');

// Хранилище для файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Шифрование AES
const encryptAES = (buffer, password) => {
  const key = crypto.scryptSync(password, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return { encryptedData: encrypted, iv: iv.toString('hex') };
};

// POST /api/containers
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { containerName, userId } = req.body;
    const filePath = req.file.path;
    const originalName = req.file.originalname;

    // Получаем ключ из таблицы users
    const keyResult = await pool.query(
      'SELECT encryption_key FROM users WHERE id = $1',
      [userId]
    );

    if (keyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const encryptionKey = keyResult.rows[0].encryption_key;

    if (!encryptionKey) {
      return res.status(400).json({ message: 'Ключ шифрования отсутствует' });
    }

    // Читаем и шифруем файл
    const buffer = fs.readFileSync(filePath);
    const { encryptedData, iv } = encryptAES(buffer, encryptionKey); // используем ключ из БД

    // Сохраняем зашифрованный файл
    const encryptedPath = `uploads/encrypted-${Date.now()}-${originalName}`;
    fs.writeFileSync(encryptedPath, encryptedData);

    // Добавляем запись в контейнеры
    await pool.query(
      'INSERT INTO containers (user_id, name, file_path, iv) VALUES ($1, $2, $3, $4)',
      [userId, containerName, encryptedPath, iv]
    );

    fs.unlinkSync(filePath); // удаляем оригинальный файл
    res.json({ message: 'Контейнер создан' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при создании контейнера' });
  }
});


// GET /api/containers/:userId
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, name, file_path, created_at FROM containers WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка получения контейнеров' });
  }
});

module.exports = router;
