const { ethers } = require("ethers");
const db = require("./db");
const fs = require("fs");
const path = require("path");

const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

// =====Загрузка ABI и bytecode=====
const contractArtifact = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "artifacts", "contracts", "DigitalWill.sol", "DigitalWill.json")
  )
);
const abi = contractArtifact.abi;
const bytecode = contractArtifact.bytecode;

async function ensureFunds(address) {
  const threshold = ethers.utils.parseEther("0.05");

  let balance = await provider.getBalance(address);

  if (balance.gte(threshold)) {
    console.log(`У пользователя ${address} достаточно средств: ${ethers.utils.formatEther(balance)} ETH`);
    return;
  }

  console.log(`У пользователя ${address} недостаточно ETH (${ethers.utils.formatEther(balance)} ETH). Отправляем...`);

  const signer = provider.getSigner(0); // Ganache-аккаунт
  const tx = await signer.sendTransaction({
    to: address,
    value: ethers.utils.parseEther("5.0"),
  });

  await tx.wait();
  console.log(`Отправлено 5 ETH на ${address}.`);

  // Ожидание появления средств (с перезапросом)
  let retries = 0;
  while (retries < 10) {
    balance = await provider.getBalance(address);
    if (balance.gte(threshold)) {
      return;
    }

    await new Promise(r => setTimeout(r, 1000));
    retries++;
  }

  throw new Error(`Не удалось подтвердить поступление ETH на ${address}`);
}


// =====Получить кошелек и контракт от имени пользователя=====
async function getUserContract(userId, contractAddress) {
  const result = await db.query('SELECT private_key FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) throw new Error("Пользователь не найден");

  const privateKey = result.rows[0].private_key;
  const wallet = new ethers.Wallet(privateKey, provider);

  await ensureFunds(wallet.address);

  const contract = new ethers.Contract(contractAddress, abi, wallet);
  return contract;
}

// =====Деплой контракта от имени пользователя=====
async function deployContract(userId, ...constructorArgs) {
  const result = await db.query('SELECT private_key FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) throw new Error("Пользователь не найден");

  const wallet = new ethers.Wallet(result.rows[0].private_key, provider);
  await ensureFunds(wallet.address);

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(...constructorArgs);
  await contract.deployed();
  console.log("Контракт задеплоен по адресу:", contract.address);
  return contract.address;
}

module.exports = {
  getUserContract,
  deployContract,
  ensureFunds,
};
