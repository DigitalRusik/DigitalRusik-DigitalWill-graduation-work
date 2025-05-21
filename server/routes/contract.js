const express = require('express');
const router = express.Router();
const pool = require('../db');
const { deployContract, ensureFunds } = require("../blockchain");
const { ethers } = require('ethers');
require('dotenv').config();
const verifyToken = require("../verifyToken");

const contractABI = require('../../artifacts/contracts/DigitalWill.sol/DigitalWill.json').abi;
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

// =====Функция создания завещания=====
async function createWillOnChain(userId, recipientAddress, dataHash, unlockTime) {
  try {
    const userRes = await pool.query(
      "SELECT private_key, eth_address, contract_address, is_verified FROM users WHERE id = $1",
      [userId]
    );

    if (!userRes.rows || userRes.rows.length === 0) {
      return { success: false, error: "Пользователь не найден" };
    }

    const {
      private_key,
      eth_address,
      contract_address,
      is_verified,
    } = userRes.rows[0];

    const signer = new ethers.Wallet(private_key, provider);
    let userContractAddress = contract_address;

    await ensureFunds(signer.address);

    if (!userContractAddress) {
      const newAddress = await deployContract(userId);
      await pool.query(
        "UPDATE users SET contract_address = $1 WHERE id = $2",
        [newAddress, userId]
      );
      userContractAddress = newAddress;
      console.log("(contract.js) Новый контракт задеплоен:", newAddress);
    }

    const contract = new ethers.Contract(userContractAddress, contractABI, signer);
    const tx = await contract.createWill(recipientAddress, dataHash, unlockTime, is_verified);
    const receipt = await tx.wait();
    const event = receipt.events?.find(e => e.event === 'WillCreated');
    if (!event) {
      return { success: false, error: "Событие WillCreated не найдено" };
    }

    const contractWillId = event.args.willId.toNumber();
    console.log("Завещание создано:", receipt.transactionHash, "Contract Will ID:", contractWillId);

    return {
      success: true,
      txHash: receipt.transactionHash,
      contractWillId
    };

  } catch (err) {
    console.error("Ошибка при создании завещания:", err);
    return { success: false, error: err.message };
  }
}
// =====Создание завещания в смарт-контракте=====
router.post("/create-will", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { recipientEmail, dataHash, unlockTime } = req.body;

  try {
    let recipientEth = ethers.constants.AddressZero;

    const recipientResult = await pool.query(
      'SELECT eth_address FROM users WHERE email = $1',
      [recipientEmail]
    );

    if (recipientResult.rows.length > 0) {
      recipientEth = recipientResult.rows[0].eth_address;
    }

    const result = await createWillOnChain(userId, recipientEth, dataHash, unlockTime);
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(201).json({
      message: "Завещание создано в блокчейне",
      txHash: result.txHash,
      contractWillId: result.contractWillId
    });

  } catch (err) {
    console.error("Ошибка при создании завещания:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});


// =====Проверка на исполнение для страницы завещаний=====
router.get('/is-executed/:ownerAddress/:contractWillId', async (req, res) => {
  const { ownerAddress, contractWillId } = req.params;
  try {
    // Получаем адрес контракта владельца
    const result = await pool.query(
      'SELECT contract_address FROM users WHERE eth_address = $1',
      [ownerAddress]
    );
    if (result.rows.length === 0 || !result.rows[0].contract_address) {
      return res.status(404).json({ message: 'Контракт не найден' });
    }

    const contractAddress = result.rows[0].contract_address;
    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    // Получаем структуру Will по индексу
    const will = await contract.wills(parseInt(contractWillId));
    const executed = will.isExecuted;

    res.json({ executed });
  } catch (err) {
    console.error('Ошибка при проверке isExecuted:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});


module.exports = router;
