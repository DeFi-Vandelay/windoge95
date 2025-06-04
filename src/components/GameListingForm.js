import React, { useState, useEffect } from 'react';
import { BrowserProvider, formatUnits, parseUnits } from 'ethers';
import { listGame, getGameDirectoryContract, getWindoge95Contract, checkBalance, approveTokens } from '../contractInteraction';
import { gameCategories } from './GameCategories';

function GameListingForm({ onShowAlert, showLoading, hideLoading }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    imageUrl: '',
    gameUrl: '',
  });
  const [walletAddress, setWalletAddress] = useState('');
  const [listingFee, setListingFee] = useState('0');
  const [listedGameId, setListedGameId] = useState(null);
  const [listedGameOwner, setListedGameOwner] = useState('');

  useEffect(() => {
    checkWalletConnection();
    loadListingFee();
  }, []);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        showLoading('Checking wallet connection...');
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      } finally {
        hideLoading();
      }
    }
  };

  const loadListingFee = async () => {
    try {
      showLoading('Loading listing fee...');
      const provider = new BrowserProvider(window.ethereum);
      const gameDirectory = getGameDirectoryContract(provider);
      const fee = await gameDirectory.listingFee();
      setListingFee(fee.toString());
      console.log('Listing fee:', formatUnits(fee, 9), 'WIN95'); // Use formatUnits with correct decimals
    } catch (error) {
      console.error('Error loading listing fee:', error);
    } finally {
      hideLoading();
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletAddress) {
      onShowAlert('Error', 'Please connect your wallet to submit a game.');
      return;
    }

    try {
      showLoading('Listing game...');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Check balance
      showLoading('Checking balance...');
      const hasEnoughBalance = await checkBalance(signer, listingFee);
      if (!hasEnoughBalance) {
        onShowAlert('Error', `Insufficient WIN95 balance. You need at least ${formatUnits(listingFee, 9)} WIN95 to list a game.`);
        return;
      }

      // Approve the listing fee
      const gameDirectory = getGameDirectoryContract(signer); // Use signer instead of provider
      
      showLoading('Approving token...');
      console.log('Approving token transfer...');
      const approveReceipt = await approveTokens(signer, await gameDirectory.getAddress(), listingFee);
      console.log('Approve transaction receipt:', approveReceipt);

      // List the game
      showLoading('Listing game...');
      console.log('Listing game with data:', formData);
      const txHash = await listGame(signer, formData);
      if (txHash) {
        console.log('Game listed successfully. Transaction hash:', txHash); // No need to convert to string
      } else {
        console.error('Error: Transaction hash is undefined');
        onShowAlert('Error', 'Error listing game: Transaction hash is undefined');
        return;
      }
      
      // Get the listed game ID and owner
      showLoading('Getting game ID and owner...');
      const gameDirectoryContract = getGameDirectoryContract(signer);
      const gameCount = await gameDirectoryContract.getGameCount();
      const listedGame = await gameDirectoryContract.getGame(Number(gameCount) - 1); // Convert gameCount to number
      setListedGameId(Number(gameCount) - 1); // Convert gameCount to number
      setListedGameOwner(listedGame.owner);

      onShowAlert('Success', `Game listed successfully.`); // No need to convert to string
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        imageUrl: '',
        gameUrl: '',
      });
    } catch (error) {
      console.error('Error listing game:', error);
      let errorMessage = error.message;
      if (error.data && error.data.message) {
        errorMessage = error.data.message;
      }
      onShowAlert('Error', `Error listing game: ${errorMessage}`);
    } finally {
      hideLoading();
    }
  };

  return (
    <form className="game-listing-form" onSubmit={handleSubmit}>
      <h2>List Your Game</h2>
      <p>Listing Fee: {formatUnits(listingFee, 9)} WIN95</p> {/* Use formatUnits with correct decimals */}
      <input
        type="text"
        name="title"
        value={formData.title}
        onChange={handleChange}
        placeholder="Game Title"
        required
      />
      <textarea
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Game Description"
        required
      />
      <select
        name="category"
        value={formData.category}
        onChange={handleChange}
        required
      >
        <option value="">Select Category</option>
        {gameCategories.map(category => (
          <option key={category.id} value={category.id}>{category.label}</option>
        ))}
      </select>
      <input
        type="url"
        name="imageUrl"
        value={formData.imageUrl}
        onChange={handleChange}
        placeholder="Game Image URL"
        required
      />
      <input
        type="url"
        name="gameUrl"
        value={formData.gameUrl}
        onChange={handleChange}
        placeholder="Game URL"
        required
      />
      <button type="submit">Submit Game</button>
      {listedGameId !== null && (
        <div className="listed-game-info">
          <p>Game listed successfully!</p>
          <p>Game ID: {listedGameId}</p>
          <p>Game Owner: {listedGameOwner}</p>
        </div>
      )}
    </form>
  );
}

export default GameListingForm;