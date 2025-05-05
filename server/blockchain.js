const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// 1. Настройка провайдера Hardhat (локальная сеть)
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// 2. Один из приватных ключей от hardhat node (временно, безопасно в локалке)
const PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Аккаунт 0

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// 3. Путь до ABI
const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
const abiPath = path.join(__dirname, "../artifacts/contracts/DigitalWill.sol/DigitalWill.json");
const contractJson = JSON.parse(fs.readFileSync(abiPath));
const abi = contractJson.abi;

// 4. Контракт с подписантом
const contract = new ethers.Contract(contractAddress, abi, wallet);

module.exports = contract;

