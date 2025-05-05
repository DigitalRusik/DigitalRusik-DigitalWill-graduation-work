const hre = require("hardhat");

async function main() {
  const DigitalWill = await hre.ethers.getContractFactory("DigitalWill");
  const contract = await DigitalWill.deploy();
  await contract.deployed();
  console.log("Контракт задеплоен по адресу:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});