async function main() {
  const [deployer] = await ethers.getSigners();
  const gameDirectoryAddress = "0xYourGameDirectoryAddress"; // Replace with actual address
  const GameDirectory = await ethers.getContractFactory("GameDirectory");
  const gameDirectory = await GameDirectory.attach(gameDirectoryAddress);

  const tx = await gameDirectory.listGame("Title", "Description", "Category", "Image URL", "Game URL");
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });