// scripts/getWills.js
const hre = require("hardhat");

async function main() {
  const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
  const DigitalWill = await hre.ethers.getContractAt("DigitalWill", contractAddress);

  const wills = await DigitalWill.getMyWills();

  console.log("Завещания текущего аккаунта:");
  wills.forEach((will, i) => {
    console.log(`\nЗавещание #${i}`);
    console.log(`Контейнер: ${will.containerName}`);
    console.log(`Получатель: ${will.recipient}`);
    console.log(`Разблокировка: ${new Date(Number(will.unlockTime) * 1000).toLocaleString()}`);
    console.log(`Верифицирован: ${will.isVerified}`);
    console.log(`Исполнено: ${will.isExecuted}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
