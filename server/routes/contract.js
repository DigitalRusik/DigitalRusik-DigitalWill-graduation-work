const express = require('express');
const router = express.Router();
const pool = require('../db');
const { deployContract, ensureFunds } = require("../blockchain");
const { ethers } = require('ethers');
require('dotenv').config();
const verifyToken = require("../verifyToken");

const contractABI = require('../../artifacts/contracts/DigitalWill.sol/DigitalWill.json').abi;
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

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

    let retries = 0;
    while (retries < 10) {
      const balance = await provider.getBalance(signer.address);
      if (balance.gte(ethers.utils.parseEther("0.05"))) break;
      console.log("⏳ Ожидание прихода средств...");
      await new Promise(r => setTimeout(r, 1000));
      retries++;
    }

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

router.post("/create-will", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { recipientEmail, dataHash, unlockTime } = req.body;

  try {
    // Проверка: существует ли получатель
    const recipientResult = await pool.query(
      'SELECT eth_address FROM users WHERE email = $1',
      [recipientEmail]
    );
    if (recipientResult.rows.length === 0) {
      return res.status(400).json({ error: 'Пользователь-получатель не зарегистрирован' });
    }

    const recipientEth = recipientResult.rows[0].eth_address;

    // Создание завещания в контракте
    const result = await createWillOnChain(userId, recipientEth, dataHash, unlockTime);
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Возвращаем только результат работы смарт-контракта
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

module.exports = router;
