const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Ensure we are connected to the correct network
  const network = await hre.ethers.provider.getNetwork();
  console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Using deployer account: ${deployer.address}`);

  // Load the contract addresses from contractInteraction.js
  const contractInteractionPath = path.join(__dirname, "..", "src", "contractInteraction.js");
  const contractInteractionContent = fs.readFileSync(contractInteractionPath, "utf8");

  const gameDirectoryAddress = contractInteractionContent.match(/const gameDirectoryAddress = '(.*)'/)[1];
  const winDoge95Address = contractInteractionContent.match(/const winDoge95Address = '(.*)'/)[1];
  console.log(`GameDirectory address: ${gameDirectoryAddress}`);
  console.log(`WinDoge95 address: ${winDoge95Address}`);

  // Load the ABI of the GameDirectory contract
  const gameDirectoryAbiPath = path.join(__dirname, "..", "src", "abis", "GameDirectory.json");
  const gameDirectoryAbi = JSON.parse(fs.readFileSync(gameDirectoryAbiPath, "utf8")).abi;

  // Create a contract instance
  const gameDirectory = new hre.ethers.Contract(gameDirectoryAddress, gameDirectoryAbi, deployer);

  // Test the listGame function
  try {
    console.log("Sending transaction to list game...");
    const tx = await gameDirectory.listGame(
      "Test Game", // Game title
      "This is a test game description", // Game description
      "Action", // Game category
      "https://example.com/image.png", // Game image URL
      "https://example.com/game", // Game URL
      { gasLimit: 3000000 } // Optional gas limit
    );
    console.log("Transaction sent, waiting for confirmation...");
    await tx.wait();
    console.log("Game listed successfully");
  } catch (error) {
    console.error("Error listing game:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});