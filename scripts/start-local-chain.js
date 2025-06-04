const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  // Set RUST_BACKTRACE environment variable
  process.env.RUST_BACKTRACE = '1';

  // Compile contracts
  await hre.run("compile");
  console.log("Contracts compiled successfully");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  const provider = hre.ethers.provider;

  // Fetch the current nonce from the network
  let nonce = await provider.getTransactionCount(deployer.address);

  // Deploy contracts
  const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 Router address on mainnet
  const treasuryAddress = deployer.address; // Using deployer as treasury for testing
  const initialSupply = ethers.parseUnits("690000000", 9); // 690 million tokens with 9 decimals
  const buyTaxRate = 5; // 5%
  const sellTaxRate = 5; // 5%

  // Calculate valid maxTxAmount and maxWalletSize (3% of total supply)
  const maxTxAmount = (initialSupply * 3n) / 100n;
  const maxWalletSize = (initialSupply * 3n) / 100n;
  
  // Add debugging information
  console.log("Initial Supply:", initialSupply.toString());
  console.log("Max Tx Amount:", maxTxAmount.toString());
  console.log("Max Wallet Size:", maxWalletSize.toString());

  const Windoge95 = await hre.ethers.getContractFactory("Windoge95");
  const winDoge95 = await Windoge95.deploy(
    routerAddress,
    treasuryAddress,
    initialSupply,
    buyTaxRate,
    sellTaxRate,
    maxTxAmount,
    maxWalletSize,
    { nonce: nonce++ }
  );
  await winDoge95.waitForDeployment();
  console.log("Windoge95 deployed to:", await winDoge95.getAddress());

  const GameDirectory = await hre.ethers.getContractFactory("GameDirectory");
  const gameDirectory = await GameDirectory.deploy(
    await winDoge95.getAddress(),
    ethers.parseUnits("1", 9), // 1 token listing fee
    20, // 20% minimum voting threshold
    51, // 51% approval threshold
    { nonce: nonce++ }
  );
  await gameDirectory.waitForDeployment();
  console.log("GameDirectory deployed to:", await gameDirectory.getAddress());

  // Set GameDirectory address in Windoge95
  await winDoge95.setGameDirectoryAddress(await gameDirectory.getAddress(), { nonce: nonce++ });
  console.log("GameDirectory address set in Windoge95");

  // Enable trading
  await winDoge95.enableTrading({ nonce: nonce++ });
  console.log("Trading enabled");

  // Update contract addresses in contractInteraction.js
  const contractInteractionPath = path.join(__dirname, "..", "src", "contractInteraction.js");
  let contractInteractionContent = fs.readFileSync(contractInteractionPath, "utf8");
  contractInteractionContent = contractInteractionContent.replace(
    /const gameDirectoryAddress = '.*'/,
    `const gameDirectoryAddress = '${await gameDirectory.getAddress()}'`
  );
  contractInteractionContent = contractInteractionContent.replace(
    /const winDoge95Address = '.*'/,
    `const winDoge95Address = '${await winDoge95.getAddress()}'`
  );
  fs.writeFileSync(contractInteractionPath, contractInteractionContent);
  console.log("Contract addresses updated in contractInteraction.js");

  // Copy ABIs to src/abis
  const abiDir = path.join(__dirname, "..", "src", "abis");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  const contracts = ["Windoge95", "GameDirectory"];

  contracts.forEach((contract) => {
    const artifact = hre.artifacts.readArtifactSync(contract);
    const abiPath = path.join(abiDir, `${contract}.json`);
    fs.writeFileSync(abiPath, JSON.stringify({ abi: artifact.abi }, null, 2));
    console.log(`${contract} ABI copied to ${abiPath}`);
  });

  // Start local Hardhat network
  console.log("Starting local Hardhat network...");
  await hre.run("node");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
