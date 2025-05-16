const express = require('express');
const router = express.Router();
const pool = require('../db');
const { deployContract, ensureFunds } = require("../blockchain");
const { ethers } = require('ethers');
require('dotenv').config();
const verifyToken = require("../verifyToken");

const contractABI = require('../../artifacts/contracts/DigitalWill.sol/DigitalWill.json').abi;
//const provider = new ethers.providers.JsonRpcProvider(process.env.LOCAL_RPC_URL);
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

async function createWillOnChain(userId, recipientAddress, dataHash, unlockTime) {
  try {
    // Получаем все необходимые данные заранее
    const userRes = await pool.query(
      "SELECT private_key, eth_address, contract_address, is_verified FROM users WHERE id = $1",
      [userId]
    );

    if (!userRes.rows || userRes.rows.length === 0) {
      return { success: false, error: "Пользователь не найден" };
    }

    // Извлекаем данные пользователя
    const {
      private_key,
      eth_address,
      contract_address,
      is_verified,
    } = userRes.rows[0];

    const signer = new ethers.Wallet(private_key, provider);
    let userContractAddress = contract_address;

    await ensureFunds(signer.address);
        // Ждём, пока баланс не поднимется до 0.05 ETH
    let retries = 0;
    while (retries < 10) {
      const balance = await provider.getBalance(signer.address);
      if (balance.gte(ethers.utils.parseEther("0.05"))) break;
      console.log("⏳ Ожидание прихода средств...");
      await new Promise(r => setTimeout(r, 1000));
      retries++;
    }

    // Если контракт ещё не задеплоен — создаём и сохраняем
    if (!userContractAddress) {
      const newAddress = await deployContract(userId); // деплой от имени пользователя

      // Обновляем поле contract_address
      await pool.query(
        "UPDATE users SET contract_address = $1 WHERE id = $2",
        [newAddress, userId]
      );

      userContractAddress = newAddress;
      console.log("(contract.js) Новый контракт задеплоен:", newAddress);
    }
    

    // Создаём контракт и вызываем метод
    const contract = new ethers.Contract(userContractAddress, contractABI, signer);
    const tx = await contract.createWill(recipientAddress, dataHash, unlockTime, is_verified);
    const receipt = await tx.wait();

    console.log("Завещание создано:", receipt.transactionHash);
    return { success: true, txHash: receipt.transactionHash };

  } catch (err) {
    console.error("Ошибка при создании завещания:", err);
    return { success: false, error: err.message };
  }
}



router.post("/create-will", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { recipientEthAddress, dataHash, unlockTime } = req.body;

  const result = await createWillOnChain(userId, recipientEthAddress, dataHash, unlockTime);

  if (result.success) {
    res.status(200).json({ message: "Завещание создано", txHash: result.txHash });
  } else {
    res.status(500).json({ error: result.error });
  }
});

module.exports = router;
