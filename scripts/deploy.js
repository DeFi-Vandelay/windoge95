const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const GameToken = await ethers.getContractFactory("GameToken");
  const gameToken = await GameToken.deploy("1000000000000000000000000"); // 1 million tokens

  await gameToken.deployed();

  console.log("GameToken deployed to:", gameToken.address);

  const GameDirectory = await ethers.getContractFactory("GameDirectory");
  const gameDirectory = await GameDirectory.deploy(gameToken.address, "100000000000000000", "1000000000000000000"); // 0.1 token listing fee, 1 token to vote

  await gameDirectory.deployed();

  console.log("GameDirectory deployed to:", gameDirectory.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});