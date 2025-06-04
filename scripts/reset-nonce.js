const { ethers } = require("hardhat");

async function resetNonce() {
  const [signer] = await ethers.getSigners();
  
  for (let i = 0; i < nonce; i++) {
    await signer.sendTransaction({
      to: signer.address,
      value: 0,
    });
  }
  
  console.log("Nonce reset completed");
}

resetNonce()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });