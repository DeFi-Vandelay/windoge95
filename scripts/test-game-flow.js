const hre = require("hardhat");
const chalk = require("chalk");
const { expect } = require("chai");

async function main() {
  const signers = await hre.ethers.getSigners();
  const owner = signers[0];
  
  // Create a large number of accounts
  const allAccounts = signers.slice(1); // Exclude the owner
  const numTestAccounts = 10;
  const numEmptyAccounts = 20;

  // Ensure we have enough accounts
  if (allAccounts.length < numTestAccounts + numEmptyAccounts) {
    throw new Error(`Not enough accounts. Need at least ${numTestAccounts + numEmptyAccounts}, but only have ${allAccounts.length}`);
  }

  // Separate test accounts and empty accounts
  const testAccounts = allAccounts.slice(0, numTestAccounts);
  const emptyAccounts = allAccounts.slice(numTestAccounts, numTestAccounts + numEmptyAccounts);

  console.log(`Using ${testAccounts.length} test accounts and ${emptyAccounts.length} empty accounts`);

  // Log the addresses of test and empty accounts
  console.log("Test account addresses:");
  testAccounts.forEach((account, index) => console.log(`  ${index + 1}: ${account.address}`));
  console.log("Empty account addresses:");
  emptyAccounts.forEach((account, index) => console.log(`  ${index + 1}: ${account.address}`));

  console.log(chalk.blue("Deploying contracts..."));

  // Deploy Windoge95
  const Windoge95 = await hre.ethers.getContractFactory("Windoge95");
  const totalSupply = hre.ethers.parseUnits("690000000", 9); // 690 million tokens
  const maxWalletPercentage = 3n; // 3% of total supply
  const maxWalletSize = (totalSupply * maxWalletPercentage) / 100n;
  const swapTokensAtAmount = totalSupply / 100n; // 1% of total supply
  const buyTaxRate = 5;
  const sellTaxRate = 5;
  const winDoge95 = await Windoge95.deploy(
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Router address (using mainnet for this example)
    owner.address, // Treasury address (owner in this case)
    totalSupply,
    buyTaxRate,
    sellTaxRate,
    maxWalletSize,
    maxWalletSize
  );
  await winDoge95.waitForDeployment();
  console.log(chalk.green("Windoge95 deployed to:"), await winDoge95.getAddress());
  console.log("Total Supply:", hre.ethers.formatUnits(totalSupply, 9));
  console.log("Max Wallet Size:", hre.ethers.formatUnits(maxWalletSize, 9));
  console.log("Swap Tokens At Amount:", hre.ethers.formatUnits(swapTokensAtAmount, 9));

  // Get the Treasury address from the Windoge95 contract
  const Treasury = await winDoge95.Treasury();
  console.log(chalk.blue("Treasury address:"), Treasury);

  // Deploy GameDirectory
  const GameDirectory = await hre.ethers.getContractFactory("GameDirectory");
  const gameDirectory = await GameDirectory.deploy(
    await winDoge95.getAddress(),
    hre.ethers.parseUnits("1", 9), // 1 token listing fee
    20, // 20% minimum voting threshold
    51 // 51% approval threshold
  );
  await gameDirectory.waitForDeployment();
  console.log(chalk.green("GameDirectory deployed to:"), await gameDirectory.getAddress());

  // Set GameDirectory address in Windoge95
  await winDoge95.setGameDirectoryAddress(await gameDirectory.getAddress());
  console.log(chalk.green("GameDirectory address set in Windoge95"));

  // Enable trading
  await winDoge95.enableTrading();
  console.log(chalk.green("Trading enabled"));

  // Calculate the amount to transfer to each account (slightly less than max wallet size)
  const transferAmount = maxWalletSize - hre.ethers.parseUnits("1000", 9); // Leave some room for fees
  console.log("Transfer amount per account:", hre.ethers.formatUnits(transferAmount, 9));

  // Check initial treasury balance
  let treasuryBalance = await winDoge95.balanceOf(Treasury);
  console.log(chalk.yellow("Initial Treasury balance:"), hre.ethers.formatUnits(treasuryBalance, 9));

  // Send tokens to test accounts
  console.log(chalk.blue("Transferring tokens to test accounts..."));
  for (let i = 0; i < testAccounts.length; i++) {
    try {
      await winDoge95.transfer(testAccounts[i].address, transferAmount);
      const balance = await winDoge95.balanceOf(testAccounts[i].address);
      console.log(`Tokens transferred to test account ${i + 1}. Balance:`, hre.ethers.formatUnits(balance, 9));
    } catch (error) {
      console.log(chalk.red(`Failed to transfer tokens to test account ${i + 1}: ${error.message}`));
    }
  }

  // Check treasury balance after transfers
  let newTreasuryBalance = await winDoge95.balanceOf(Treasury);
  let treasuryBalanceChange = newTreasuryBalance - treasuryBalance;
  console.log(chalk.yellow("Treasury balance after transfers:"), hre.ethers.formatUnits(newTreasuryBalance, 9));
  console.log(chalk.yellow("Treasury balance change:"), hre.ethers.formatUnits(treasuryBalanceChange, 9));

  // Send tokens to empty accounts
  console.log(chalk.blue("Transferring tokens to empty accounts..."));
  for (let i = 0; i < emptyAccounts.length; i++) {
    try {
      await winDoge95.transfer(emptyAccounts[i].address, swapTokensAtAmount);
      const balance = await winDoge95.balanceOf(emptyAccounts[i].address);
      console.log(`Tokens transferred to empty account ${i + 1}. Balance:`, hre.ethers.formatUnits(balance, 9));
    } catch (error) {
      console.log(chalk.red(`Failed to transfer tokens to empty account ${i + 1}: ${error.message}`));
    }
  }

  // Check treasury balance after transfers to empty accounts
  treasuryBalance = newTreasuryBalance;
  newTreasuryBalance = await winDoge95.balanceOf(Treasury);
  treasuryBalanceChange = newTreasuryBalance - treasuryBalance;
  console.log(chalk.yellow("Treasury balance after transfers to empty accounts:"), hre.ethers.formatUnits(newTreasuryBalance, 9));
  console.log(chalk.yellow("Treasury balance change:"), hre.ethers.formatUnits(treasuryBalanceChange, 9));

  // Approve GameDirectory to spend tokens for multiple accounts
  console.log(chalk.blue("Approving GameDirectory to spend tokens..."));
  for (let i = 0; i < testAccounts.length; i++) {
    try {
      await winDoge95.connect(testAccounts[i]).approve(await gameDirectory.getAddress(), transferAmount);
      console.log(chalk.green(`GameDirectory approved to spend tokens for test account ${i + 1}`));
    } catch (error) {
      console.log(chalk.red(`Failed to approve GameDirectory for test account ${i + 1}: ${error.message}`));
    }
  }

  // Check initial accumulated fees
  let initialAccumulatedFees = await winDoge95.getAccumulatedFees();
  console.log(chalk.yellow("Initial accumulated fees:"), hre.ethers.formatUnits(initialAccumulatedFees, 9));

  // Publish a game with the first test account
  const listingFee = await gameDirectory.listingFee();
  const publisherBalanceBefore = await winDoge95.balanceOf(testAccounts[0].address);
  const accumulatedFeesBefore = await winDoge95.getAccumulatedFees();
  try {
    await gameDirectory.connect(testAccounts[0]).listGame(
      "Test Game",
      "A game for testing",
      "Test",
      "https://example.com/image.jpg",
      "https://example.com/game"
    );
    console.log(chalk.green("Game published by the first test account"));
    const publisherBalanceAfter = await winDoge95.balanceOf(testAccounts[0].address);
    const balanceDifference = publisherBalanceBefore - publisherBalanceAfter;
    console.log("Publisher's balance before:", hre.ethers.formatUnits(publisherBalanceBefore, 9));
    console.log("Publisher's balance after:", hre.ethers.formatUnits(publisherBalanceAfter, 9));
    console.log("Balance difference:", hre.ethers.formatUnits(balanceDifference, 9));
    console.log("Listing fee:", hre.ethers.formatUnits(listingFee, 9));
    if (balanceDifference === listingFee) {
      console.log(chalk.green("Listing fee deducted correctly"));
    } else {
      console.log(chalk.red("WARNING: Listing fee deduction mismatch"));
    }

    // Check if the accumulated fees increased by the listing fee amount
    const accumulatedFeesAfter = await winDoge95.getAccumulatedFees();
    const accumulatedFeesDifference = accumulatedFeesAfter - accumulatedFeesBefore;
    console.log(chalk.yellow("Accumulated fees difference:"), hre.ethers.formatUnits(accumulatedFeesDifference, 9));
    if (accumulatedFeesDifference === listingFee) {
      console.log(chalk.green("Listing fee added to accumulated fees correctly"));
    } else {
      console.log(chalk.red("WARNING: Listing fee not added to accumulated fees correctly"));
    }
  } catch (error) {
    console.log(chalk.red(`Failed to publish game: ${error.message}`));
  }

  // Get the total supply to calculate voting thresholds
  const actualTotalSupply = await winDoge95.totalSupply();
  const minVotingThreshold = (actualTotalSupply * 20n) / 100n; // 20% of total supply
  const approvalThreshold = (minVotingThreshold * 51n) / 100n; // 51% of minimum voting threshold

  console.log("Actual Total Supply:", hre.ethers.formatUnits(actualTotalSupply, 9));
  console.log("Minimum voting threshold:", hre.ethers.formatUnits(minVotingThreshold, 9));
  console.log("Approval threshold:", hre.ethers.formatUnits(approvalThreshold, 9));

  // Vote with multiple accounts to accept the game
  console.log(chalk.blue("Voting for the game..."));
  let totalVotes = 0n;
  let approvalVotes = 0n;

  for (let i = 0; i < testAccounts.length; i++) {
    try {
      const accountBalance = await winDoge95.balanceOf(testAccounts[i].address);
      await gameDirectory.connect(testAccounts[i]).voteForGame(0, i < 6); // First 6 accounts approve, rest reject
      totalVotes += accountBalance;
      if (i < 6) {
        approvalVotes += accountBalance;
        console.log(chalk.green(`Approval vote cast by account ${i + 1} with weight ${hre.ethers.formatUnits(accountBalance, 9)}`));
      } else {
        console.log(chalk.yellow(`Rejection vote cast by account ${i + 1} with weight ${hre.ethers.formatUnits(accountBalance, 9)}`));
      }
    } catch (error) {
      console.log(chalk.red(`Failed to cast vote for account ${i + 1}: ${error.message}`));
    }
  }

  console.log("Total votes cast:", hre.ethers.formatUnits(totalVotes, 9));
  console.log("Approval votes cast:", hre.ethers.formatUnits(approvalVotes, 9));

  // Wait for game approval
  let gameApproved = false;
  let attempts = 0;
  while (!gameApproved && attempts < 10) {
    const game = await gameDirectory.getGame(0);
    gameApproved = game.approved;
    if (!gameApproved) {
      console.log(chalk.yellow("Waiting for game approval..."));
      console.log("Current game state:", 
        "Total votes:", hre.ethers.formatUnits(game.totalVotes, 9),
        "Approval votes:", hre.ethers.formatUnits(game.approvalVotes, 9),
        "Approved:", game.approved,
        "Rejected:", game.rejected
      );
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before checking again
      attempts++;
    }
  }

  if (gameApproved) {
    console.log(chalk.green("Game approved!"));
  } else {
    console.log(chalk.red("Game not approved after multiple attempts. Please check the voting logic."));
  }

  // Check balances before distribution
  console.log(chalk.blue("Balances before distribution:"));
  const balancesBefore = [];
  for (let i = 0; i < testAccounts.length; i++) {
    const balance = await winDoge95.balanceOf(testAccounts[i].address);
    balancesBefore.push(balance);
    console.log(`Test account ${i + 1} balance:`, hre.ethers.formatUnits(balance, 9));
  }

  // Function to check if fees have exceeded 1%
  async function checkFeesExceeded1Percent() {
    const accumulatedFees = await winDoge95.getAccumulatedFees();
    const totalSupply = await winDoge95.totalSupply();
    const onePercentThreshold = totalSupply / 100n;
    if (accumulatedFees >= onePercentThreshold) {
      console.log(chalk.green("\n🚨 Fees collected have exceeded 1% of total supply!"));
      console.log(`Accumulated fees: ${hre.ethers.formatUnits(accumulatedFees, 9)}`);
      console.log(`1% threshold: ${hre.ethers.formatUnits(onePercentThreshold, 9)}`);
      return true;
    }
    return false;
  }

  console.log(chalk.blue("\nMaking multiple transfers to trigger swap and distribute..."));
  const smallTransferAmount = swapTokensAtAmount / 10n;
  const largeTransferAmount = swapTokensAtAmount + hre.ethers.parseUnits("1000", 9);

  console.log(`Swap threshold: ${hre.ethers.formatUnits(swapTokensAtAmount, 9)}`);
  console.log(`Small transfer amount: ${hre.ethers.formatUnits(smallTransferAmount, 9)}`);
  console.log(`Large transfer amount: ${hre.ethers.formatUnits(largeTransferAmount, 9)}`);

  let manuallyAccumulatedFees = 0n;
  let transferCount = 0;
  let distributionTriggered = false;
  let transferDirection = true; // true: test to empty, false: empty to test
  let onePercentCrossed = false;

  const onePercentThreshold = totalSupply / 100n;

  console.log(`Total supply: ${hre.ethers.formatUnits(totalSupply, 9)}`);
  console.log(`1% threshold: ${hre.ethers.formatUnits(onePercentThreshold, 9)}`);

  async function checkDistributionTriggered() {
    if (onePercentThreshold < manuallyAccumulatedFees) {
      console.log(chalk.green("\n🚨 Distribution function has been triggered!"));
      console.log(`Manually accumulated fees: ${hre.ethers.formatUnits(manuallyAccumulatedFees, 9)}`);
      console.log(`Contract balance: ${hre.ethers.formatUnits(contractBalance, 9)}`);
      return true;
    }
    return false;
  }

  while (!distributionTriggered) {
    const senderAccounts = transferDirection ? testAccounts : emptyAccounts;
    const recipientAccounts = transferDirection ? emptyAccounts : testAccounts;

    for (let i = 0; i < senderAccounts.length; i++) {
      transferCount++;
      const sender = senderAccounts[i];
      const recipient = recipientAccounts[i % recipientAccounts.length];
      const amount = transferCount % 2 === 0 ? smallTransferAmount : largeTransferAmount;

      console.log(chalk.blue(`\nTransfer ${transferCount}:`));
      console.log(`Direction: ${transferDirection ? "Test to Empty" : "Empty to Test"}`);
      console.log(`Sender: ${sender.address}`);
      console.log(`Recipient: ${recipient.address}`);
      console.log(`Amount: ${hre.ethers.formatUnits(amount, 9)}`);

      const senderBalanceBefore = await winDoge95.balanceOf(sender.address);
      const recipientBalanceBefore = await winDoge95.balanceOf(recipient.address);

      try {
        await winDoge95.connect(sender).transfer(recipient.address, amount);

        const senderBalanceAfter = await winDoge95.balanceOf(sender.address);
        const recipientBalanceAfter = await winDoge95.balanceOf(recipient.address);

        console.log(`Sender balance before: ${hre.ethers.formatUnits(senderBalanceBefore, 9)}`);
        console.log(`Sender balance after: ${hre.ethers.formatUnits(senderBalanceAfter, 9)}`);
        console.log(`Recipient balance before: ${hre.ethers.formatUnits(recipientBalanceBefore, 9)}`);
        console.log(`Recipient balance after: ${hre.ethers.formatUnits(recipientBalanceAfter, 9)}`);

        const expectedFeeCollected = (amount * BigInt(sellTaxRate)) / 100n;
        manuallyAccumulatedFees += expectedFeeCollected;
        console.log(`Expected fee collected: ${hre.ethers.formatUnits(expectedFeeCollected, 9)}`);
        console.log(`Manually accumulated fees: ${hre.ethers.formatUnits(manuallyAccumulatedFees, 9)}`);

        // Check if manually accumulated fees have crossed 1% of total supply
        if (!onePercentCrossed && manuallyAccumulatedFees >= onePercentThreshold) {
          console.log(chalk.yellow("\n🚨 Manually accumulated fees have crossed 1% of total supply!"));
          console.log(`Manually accumulated fees: ${hre.ethers.formatUnits(manuallyAccumulatedFees, 9)}`);
          console.log(`1% threshold: ${hre.ethers.formatUnits(onePercentThreshold, 9)}`);
          onePercentCrossed = true;
        }

        // Check if distribution was triggered after the transfer
        distributionTriggered = await checkDistributionTriggered();
        if (distributionTriggered) break;

      } catch (error) {
        console.log(chalk.red(`Transfer failed: ${error.message}`));
        // If transfer fails (e.g., due to insufficient balance), skip to the next sender
        continue;
      }
    }

    // Reverse the transfer direction for the next round
    transferDirection = !transferDirection;
  }

  console.log(chalk.yellow("\nTotal number of transfers made:"), transferCount);
  console.log(chalk.yellow("Manually accumulated fees:"), hre.ethers.formatUnits(manuallyAccumulatedFees, 9));

  // Check actual accumulated fees after distribution
  const actualAccumulatedFees = await winDoge95.getAccumulatedFees();
  console.log(chalk.yellow("Actual accumulated fees after distribution:"), hre.ethers.formatUnits(actualAccumulatedFees, 9));

  // Reset totalBuilderRewards and totalVoterRewards before recalculating
  totalBuilderRewards = 0n;
  totalVoterRewards = 0n;

  // Check balances and rewards after distribution
  console.log(chalk.blue("\nBalances and rewards after distribution:"));
  for (let i = 0; i < testAccounts.length; i++) {
    const balance = await winDoge95.balanceOf(testAccounts[i].address);
    const builderReward = await winDoge95.builderRewards(testAccounts[i].address);
    const voterReward = await winDoge95.voterRewards(testAccounts[i].address);

    console.log(`Test account ${i + 1}:`);
    console.log(`  Balance: ${hre.ethers.formatUnits(balance, 9)}`);
    console.log(`  Builder reward: ${hre.ethers.formatUnits(builderReward, 9)}`);
    console.log(`  Voter reward: ${hre.ethers.formatUnits(voterReward, 9)}`);

    totalBuilderRewards += builderReward;
    totalVoterRewards += voterReward;
  }

  console.log(chalk.yellow("\nTotal rewards:"));
  console.log(`Builder rewards: ${hre.ethers.formatUnits(totalBuilderRewards, 9)}`);
  console.log(`Voter rewards: ${hre.ethers.formatUnits(totalVoterRewards, 9)}`);

  // Check final Treasury balance
  const finalTreasuryBalance = await winDoge95.balanceOf(Treasury);
  console.log(chalk.yellow("\nFinal Treasury balance:"), hre.ethers.formatUnits(finalTreasuryBalance, 9));

  // Additional checks
  console.log(chalk.blue("\nAdditional checks:"));
  const contractETHBalance = await hre.ethers.provider.getBalance(winDoge95.getAddress());
  console.log("Contract ETH balance:", hre.ethers.formatUnits(contractETHBalance, 18));

  // Check if rewards are distributed correctly
  const expectedBuilderRewards = (manuallyAccumulatedFees * 40n) / 100n;
  const expectedVoterRewards = (manuallyAccumulatedFees * 20n) / 100n;
  const expectedTreasuryTokens = (manuallyAccumulatedFees * 40n) / 100n;

  console.log("Expected builder rewards:", hre.ethers.formatUnits(expectedBuilderRewards, 9));
  console.log("Expected voter rewards:", hre.ethers.formatUnits(expectedVoterRewards, 9));
  console.log("Expected treasury tokens:", hre.ethers.formatUnits(expectedTreasuryTokens, 9));

  if (totalBuilderRewards === expectedBuilderRewards) {
    console.log(chalk.green("Builder rewards distributed correctly"));
  } else {
    console.log(chalk.red("WARNING: Builder rewards distribution mismatch"));
  }

  if (totalVoterRewards === expectedVoterRewards) {
    console.log(chalk.green("Voter rewards distributed correctly"));
  } else {
    console.log(chalk.red("WARNING: Voter rewards distribution mismatch"));
  }

  if (finalTreasuryBalance === expectedTreasuryTokens) {
    console.log(chalk.green("Treasury tokens distributed correctly"));
  } else {
    console.log(chalk.red("WARNING: Treasury tokens distribution mismatch"));
  }

  // Check final accumulated fees (should be close to zero)
  const finalAccumulatedFees = await winDoge95.getAccumulatedFees();
  console.log(chalk.yellow("Final accumulated fees:"), hre.ethers.formatUnits(finalAccumulatedFees, 9));
  if (finalAccumulatedFees === 0n) {
    console.log(chalk.green("All fees have been distributed"));
  } else {
    console.log(chalk.red("WARNING: Some fees remain undistributed"));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(chalk.red(error));
    process.exit(1);
  });
