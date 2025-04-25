const express = require('express');
const router = express.Router();
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const upload = multer({ storage: multer.memoryStorage() }); // шифруем из памяти

const encryptAES = (buffer, password) => {
  const key = crypto.scryptSync(password, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return { encryptedData: encrypted, iv: iv.toString('hex') };
};

router.post('/', upload.fields([
  { name: 'mainFile', maxCount: 1 },
  { name: 'extraFiles', maxCount: 20 } // ограничение до 20 доп. файлов
]), async (req, res) => {
  try {
    const { containerName, userId } = req.body;
    const mainFile = req.files['mainFile']?.[0];
    const extraFiles = req.files['extraFiles'] || [];

    if (!mainFile) return res.status(400).json({ message: 'Основной файл обязателен' });


    // Получение ключа из БД
    const userResult = await pool.query('SELECT encryption_key FROM users WHERE id = $1', [userId]);
    const encryptionKey = userResult.rows[0]?.encryption_key;
    if (!encryptionKey) return res.status(400).json({ message: 'Ключ шифрования не найден' });

    const filePaths = [];

    // Обработка основного файла
    const mainEnc = encryptAES(mainFile.buffer, encryptionKey);
    const mainPath = `uploads/${Date.now()}-main-${mainFile.originalname}`;
    fs.writeFileSync(mainPath, mainEnc.encryptedData);
    filePaths.push({ name: mainFile.originalname, path: mainPath, iv: mainEnc.iv });

    // Обработка доп. файлов
    for (const file of extraFiles) {
      const enc = encryptAES(file.buffer, encryptionKey);
      const filePath = `uploads/${Date.now()}-${file.originalname}`;
      fs.writeFileSync(filePath, enc.encryptedData);
      filePaths.push({ name: file.originalname, path: filePath, iv: enc.iv });
    }

    // Сохраняем контейнер
    await pool.query(
      'INSERT INTO containers (user_id, name, file_path, iv, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [userId, containerName, JSON.stringify(filePaths), '']
    );

    res.status(201).json({ message: 'Контейнер успешно создан' });

  } catch (err) {
    console.error('Ошибка создания контейнера:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }

});

router.post('/verify-password', async (req, res) => {
  const { userId, password } = req.body;

  try {
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Пользователь не найден' });

    const isMatch = await bcrypt.compare(password, result.rows[0].password);
    if (!isMatch) return res.status(401).json({ message: 'Неверный пароль' });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Получаем путь к файлам
    const container = await pool.query('SELECT file_path FROM containers WHERE id = $1', [id]);
    const fileArray = JSON.parse(container.rows[0].file_path);

    // Удаляем файлы из папки
    for (const file of fileArray) {
      fs.unlinkSync(file.path);
    }

    await pool.query('DELETE FROM containers WHERE id = $1', [id]);
    res.json({ message: 'Контейнер удалён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при удалении' });
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