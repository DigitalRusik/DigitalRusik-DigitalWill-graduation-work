const { ethers } = require("hardhat");

async function main() {
  console.log("Запуск деплоя...");

  const DigitalWill = await ethers.getContractFactory("DigitalWill");
  console.log("Контракт собран");

  const contract = await DigitalWill.deploy();
  await contract.deployed();

  console.log("(deploy.js) Контракт задеплоен по адресу:", contract.address);
}

main().catch((error) => {
  console.error("Ошибка в deploy.js:", error);
  process.exitCode = 1;
});