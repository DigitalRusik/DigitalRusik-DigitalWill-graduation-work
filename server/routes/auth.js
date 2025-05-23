const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ethers } = require('ethers');

const contractABI = require('../../artifacts/contracts/DigitalWill.sol/DigitalWill.json').abi;
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

// =====Регистрация пользователя=====
router.post('/register', async (req, res) => {
  const { firstName, lastName, patronymic, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const ethWallet = ethers.Wallet.createRandom();
    const ethAddress = ethWallet.address;
    const privateKey = ethWallet.privateKey;

    const encryptionKey = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      'INSERT INTO users (first_name, last_name, patronymic, email, password, eth_address, encryption_key, private_key, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false) RETURNING *',
      [firstName, lastName, patronymic, email, hashedPassword, ethAddress, encryptionKey, privateKey]
    );

    const newUser = result.rows[0];

    // Автоустановка получателя в контракте, если завещание на него уже существует
    try {
      const willsRes = await pool.query(
        `SELECT w.id, w.contract_will_id, w.recipient_full_name, u.private_key, u.contract_address
         FROM wills w
         JOIN users u ON u.eth_address = w.owner
         WHERE w.recipient = $1 AND w.contract_will_id IS NOT NULL`,
        [newUser.email]
      );

      for (const will of willsRes.rows) {
        const { id, contract_will_id, recipient_full_name, private_key, contract_address } = will;

        if (!contract_address || contract_will_id == null) continue;

        const fullNameFromDB = (recipient_full_name || '').trim().toLowerCase();
        const fullNameUser = `${newUser.last_name} ${newUser.first_name} ${newUser.patronymic}`.trim().toLowerCase();
        if (fullNameFromDB && fullNameFromDB !== fullNameUser) {
          console.warn(`Несовпадение ФИО для ${newUser.email}, завещание ${id} не будет назначено`);
          continue;
        }

        const signer = new ethers.Wallet(private_key, provider);
        const contract = new ethers.Contract(contract_address, contractABI, signer);

        const onchainWill = await contract.wills(contract_will_id);
        if (onchainWill.recipient !== ethers.constants.AddressZero) continue;

        const tx = await contract.setRecipient(contract_will_id, newUser.eth_address);
        await tx.wait();

        console.log(`Назначен получатель для willId ${contract_will_id}`);
      }
    } catch (err) {
      console.error('Ошибка при установке получателя для завещаний:', err);
    }
    
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
        fullName: `${user.last_name} ${user.first_name} ${user.patronymic}`,
        isVerified: user.is_verified
      },
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

// =====Проверка статуса верификации пользователя=====
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

// =====Авторизация администратора=====
router.post('/admin-login', (req, res) => {
  const { login, password } = req.body;

  if (login === 'admin' && password === 'admin') {
    return res.json({ message: 'Успешный вход', role: 'admin' });
  } else {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
});


module.exports = router;