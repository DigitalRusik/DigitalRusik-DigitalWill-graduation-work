const express = require('express');
const router = express.Router();
const pool = require('../db');
const { ethers } = require('ethers');
require('dotenv').config();

const contractABI = require('../../artifacts/contracts/DigitalWill.sol/DigitalWill.json').abi;
const contractAddress = process.env.CONTRACT_ADDRESS;

const provider = new ethers.JsonRpcProvider(process.env.LOCAL_RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, contractABI, signer);

router.post('/create-will', async (req, res) => {
  const { ethAddress, recipientEth, containerName, unlockTime } = req.body;

  try {
    const user = await pool.query('SELECT is_verified FROM users WHERE eth_address = $1', [ethAddress]);

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const isVerified = user.rows[0].is_verified;

    const tx = await contract.createWill(recipientEth, containerName, unlockTime, isVerified);
    await tx.wait();

    res.status(200).json({ message: 'Завещание успешно сохранено в блокчейне', txHash: tx.hash });
  } catch (err) {
    console.error('Ошибка вызова контракта:', err);
    res.status(500).json({ message: 'Ошибка при вызове смарт-контракта' });
  }
});

module.exports = router;