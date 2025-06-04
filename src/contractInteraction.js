import { Contract, BrowserProvider, formatUnits, parseUnits } from 'ethers';
import GameDirectoryABI from './abis/GameDirectory.json';
import Windoge95ABI from './abis/Windoge95.json';

// Make sure these addresses are correct
const gameDirectoryAddress = '0xC1dC7a8379885676a6Ea08E67b7Defd9a235De71';
const winDoge95Address = '0x50cf1849e32E6A17bBFF6B1Aa8b1F7B479Ad6C12';

export const getGameDirectoryContract = (providerOrSigner) => {
  return new Contract(gameDirectoryAddress, GameDirectoryABI.abi, providerOrSigner);
};

export const getWindoge95Contract = (providerOrSigner) => {
  return new Contract(winDoge95Address, Windoge95ABI.abi, providerOrSigner);
};

export const listGame = async (signer, gameData) => {
  console.log('Listing game with data:', gameData);
  const gameDirectory = getGameDirectoryContract(signer);
  console.log('GameDirectory contract:', gameDirectory);
  console.log('GameDirectory address:', await gameDirectory.getAddress());

  try {
    // Get the provider from the signer
    const provider = signer.provider;
    // Fetch the current nonce from the network
    const nonce = await provider.getTransactionCount(await signer.getAddress());
    console.log('Current nonce:', nonce);

    // Log all values being sent
    console.log('Title:', gameData.title);
    console.log('Description:', gameData.description);
    console.log('Category:', gameData.category);
    console.log('Image URL:', gameData.imageUrl);
    console.log('Game URL:', gameData.gameUrl);
    console.log('Value:', parseUnits('1', 9).toString());
    console.log('Gas Limit:', 3000000);

    const tx = await gameDirectory.listGame(
      gameData.title,
      gameData.description,
      gameData.category,
      gameData.imageUrl,
      gameData.gameUrl,
      {nonce: nonce, gasLimit: 3000000 } // Manually set the gas limit
    );
    console.log('Transaction:', tx);

    const receipt = await tx.wait();
    console.log('Transaction receipt:', receipt);
    console.log('Transaction hash:', receipt.hash); // Log the transaction hash
    return receipt.hash; // Ensure this is returned
  } catch (error) {
    console.error('Error in listGame function:', error);
    throw error;
  }
};

export const voteForGame = async (signer, gameId, approve) => {
  const gameDirectory = getGameDirectoryContract(signer);
  const tx = await gameDirectory.voteForGame(gameId, approve, { gasLimit: 3000000 }); // Manually set the gas limit
  await tx.wait();
  return tx.hash;
};

export const batchVoteForGames = async (signer, gameIds, approves) => {
  const gameDirectory = getGameDirectoryContract(signer);
  const tx = await gameDirectory.batchVoteForGames(gameIds, approves, { gasLimit: 3000000 }); // Manually set the gas limit
  await tx.wait();
  return tx.hash;
};

export const getApprovalThreshold = async (provider) => {
  const gameDirectory = getGameDirectoryContract(provider);
  return await gameDirectory.approvalThreshold();
};

export const getGameCount = async (provider) => {
  const gameDirectory = getGameDirectoryContract(provider);
  return await gameDirectory.getGameCount();
};

export const getGame = async (provider, gameId) => {
  const gameDirectory = getGameDirectoryContract(provider);
  const game = await gameDirectory.getGame(gameId);

  return ({
    id: gameId,
    title: game[0],
    description: game[1],
    category: game[2],
    imageUrl: game[3],
    gameUrl: game[4],
    owner: game[5],
    approvalVotes: game[6],
    rejectionVotes: game[7],
    approved: game[8],
    rejected: game[9],
  })
};

export const getAllGames = async (provider) => {
  const gameDirectory = getGameDirectoryContract(provider);
  const games = await gameDirectory.getAllGames();
  return games.map((game, index) => ({
    id: index, // Use the index as the game id
    title: game[0],
    description: game[1],
    category: game[2],
    imageUrl: game[3],
    gameUrl: game[4],
    owner: game[5],
    approvalVotes: game[6],
    rejectionVotes: game[7],
    approved: game[8],
    rejected: game[9],
  }));
};

export const getTokenBalance = async (provider, address) => {
  const windoge95Contract = getWindoge95Contract(provider);
  const balance = await windoge95Contract.balanceOf(address);
  const decimals = await windoge95Contract.decimals();
  return formatUnits(balance, decimals);
};

export const approveTokens = async (signer, spender, amount) => {
  const windoge95Contract = getWindoge95Contract(signer);
  const tx = await windoge95Contract.approve(spender, amount, { gasLimit: 3000000 }); // Manually set the gas limit
  return await tx.wait();
};

export const checkBalance = async (signer, requiredAmount) => {
  const windoge95Contract = getWindoge95Contract(signer);
  const balance = await windoge95Contract.balanceOf(await signer.getAddress());
  const decimals = await windoge95Contract.decimals();
  return parseFloat(formatUnits(balance, decimals)) >= parseFloat(formatUnits(requiredAmount, decimals));
};