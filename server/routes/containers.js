const express = require('express');
const router = express.Router();
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const mime = require('mime-types');
const archiver = require('archiver');
const { ethers } = require("ethers");

const { ensureFunds } = require('../blockchain');
const contractArtifact = require('../../artifacts/contracts/DigitalWill.sol/DigitalWill.json');
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

const upload = multer({ storage: multer.memoryStorage() });

// ===== Шифрование AES при загрузке =====
const encryptAES = (buffer, password) => {
  const key = crypto.scryptSync(password, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return { encryptedData: encrypted, iv: iv.toString('hex') };
};

// ===== Создание контейнера =====
router.post('/', upload.fields([
  { name: 'mainFile', maxCount: 1 },
  { name: 'extraFiles', maxCount: 20 }
]), async (req, res) => {
  try {
    const { containerName, userId } = req.body;
    const mainFile = req.files['mainFile']?.[0];
    const extraFiles = req.files['extraFiles'] || [];

    if (!mainFile) return res.status(400).json({ message: 'Основной файл обязателен' });

    const userResult = await pool.query('SELECT encryption_key FROM users WHERE id = $1', [userId]);
    const encryptionKey = userResult.rows[0]?.encryption_key;
    if (!encryptionKey) return res.status(400).json({ message: 'Ключ шифрования не найден' });

    const filePaths = [];

    const mainEnc = encryptAES(mainFile.buffer, encryptionKey);
    const mainPath = `uploads/${Date.now()}-main-${mainFile.originalname}`;
    fs.writeFileSync(mainPath, mainEnc.encryptedData);
    filePaths.push({ name: mainFile.originalname, path: mainPath, iv: mainEnc.iv });

    for (const file of extraFiles) {
      const enc = encryptAES(file.buffer, encryptionKey);
      const filePath = `uploads/${Date.now()}-${file.originalname}`;
      fs.writeFileSync(filePath, enc.encryptedData);
      filePaths.push({ name: file.originalname, path: filePath, iv: enc.iv });
    }

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

// ===== Проверка пароля пользователя =====
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

// ===== Скачивание файла из контейнера =====
router.post('/download/:containerId', async (req, res) => {
  const { containerId } = req.params;
  const { userId, password, fileName } = req.body;

  try {
    const user = await pool.query('SELECT password, encryption_key FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) return res.status(404).json({ message: 'Пользователь не найден' });

    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) return res.status(401).json({ message: 'Неверный пароль' });

    const encryptionKey = user.rows[0].encryption_key;

    const containerRes = await pool.query('SELECT file_path FROM containers WHERE id = $1', [containerId]);
    const fileArray = JSON.parse(containerRes.rows[0].file_path);
    const fileMeta = fileArray.find(f => f.name === fileName);
    if (!fileMeta) return res.status(404).json({ message: 'Файл не найден в контейнере' });

    // Дешифровка
    const buffer = fs.readFileSync(fileMeta.path);
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = Buffer.from(fileMeta.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(buffer), decipher.final()]);

    const mimeType = mime.lookup(fileMeta.name) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileMeta.name}"`);
    res.send(decrypted);
  } catch (err) {
    console.error('Ошибка при скачивании файла:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ===== Удаление контейнера =====
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const container = await pool.query('SELECT file_path FROM containers WHERE id = $1', [id]);
    const fileArray = JSON.parse(container.rows[0].file_path);

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

// ===== Скачивание файлов завещания =====
router.get('/download-will/:willId', async (req, res) => {
  const { willId } = req.params;

  try {
    // 1. Получение полных данных завещания
    const willResult = await pool.query(
      'SELECT owner, recipient, data_hash, contract_will_id FROM wills WHERE id = $1',
      [willId]
    );
    if (willResult.rows.length === 0) {
      return res.status(404).json({ message: 'Завещание не найдено' });
    }

    const { owner: ownerAddress, recipient, data_hash: containerName, contract_will_id } = willResult.rows[0];

    // 2. Получение private_key получателя и contract_address владельца
    const recipientRes = await pool.query(
      'SELECT private_key FROM users WHERE email = $1',
      [recipient]
    );
    if (recipientRes.rows.length === 0) {
      return res.status(403).json({ message: 'Получатель не найден' });
    }
    const recipientPrivateKey = recipientRes.rows[0].private_key;

    const ownerRes = await pool.query(
      'SELECT contract_address FROM users WHERE eth_address = $1',
      [ownerAddress]
    );
    if (ownerRes.rows.length === 0 || !ownerRes.rows[0].contract_address) {
      return res.status(404).json({ message: 'Контракт владельца не найден' });
    }
    const contract_address = ownerRes.rows[0].contract_address;

    // 3. Вызов executeWill от имени получателя
    const recipientWallet = new ethers.Wallet(recipientPrivateKey, provider);
    await ensureFunds(recipientWallet.address);

    const contract = new ethers.Contract(contract_address, contractArtifact.abi, recipientWallet);
    console.log('ID контракта завещания', contract_will_id);
    const onchainWill = await contract.wills(contract_will_id);
    console.log('Recipient в контракте:', onchainWill.recipient);
    if (contract_will_id == null) {
      return res.status(400).json({ message: 'Завещание не зарегистрировано в контракте' });
    }

    try {
      const tx = await contract.executeWill(contract_will_id);
      await tx.wait();
      console.log(`Завещание ${willId} исполнено через контракт`);
    } catch (e) {
      console.error("Смарт-контракт отказал в исполнении:", e.reason || e.message);
      return res.status(403).json({ message: 'Завещание ещё не разблокировано' });
    }

    // 4. Получение encryption key владельца для дешифровки
    const userResult = await pool.query(
      'SELECT encryption_key FROM users WHERE eth_address = $1',
      [ownerAddress]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Владелец завещания не найден' });
    }

    const encryptionKey = userResult.rows[0].encryption_key;
    const keyBuffer = crypto.scryptSync(encryptionKey, 'salt', 32);

    // 5. Получение контейнера и файлов
    const containerResult = await pool.query(
      'SELECT file_path FROM containers WHERE name = $1',
      [containerName]
    );
    if (containerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Контейнер не найден' });
    }

    const filesArray = JSON.parse(containerResult.rows[0].file_path);
    if (!Array.isArray(filesArray) || filesArray.length === 0) {
      return res.status(404).json({ message: 'Файлы в контейнере не найдены' });
    }

    // 6. Формирование архива
    const safeName = containerName.replace(/[^\w\d_-]/g, "_"); // Формирование имени для архива
    res.setHeader('Content-Disposition', `attachment; filename=${safeName}.zip`);
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const file of filesArray) {
      const fullFilePath = path.resolve(__dirname, '..', file.path);
      const encryptedData = fs.readFileSync(fullFilePath);
      const ivBuffer = Buffer.from(file.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
      const decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
      archive.append(decryptedData, { name: file.name });
    }

    await archive.finalize();

  } catch (err) {
    console.error('Ошибка при скачивании завещания:', err);
    res.status(500).json({ message: 'Ошибка сервера при скачивании файла' });
  }
});

// ===== Получение списка контейнеров пользователя =====
router.get('/user/:userId', async (req, res) => {
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

// ===== Получить контейнер по названию =====
router.get('/by-name/:name', async (req, res) => {
  const { name } = req.params;

  try {
    const result = await pool.query('SELECT * FROM containers WHERE name = $1', [name]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Контейнер не найден' });
    }

    const container = result.rows[0];
    const files = JSON.parse(container.file_path).map(f => ({
      name: f.name,
      container_id: container.id
    }));

    res.json({ files });
  } catch (err) {
    console.error('Ошибка при получении контейнера по названию:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});
module.exports = router;