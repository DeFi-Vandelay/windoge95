import React, { useState, useEffect } from 'react';
import { BrowserProvider, formatEther } from 'ethers';
import { getAllGames, batchVoteForGames, getApprovalThreshold, getWindoge95Contract } from '../contractInteraction';

function DAOVoting({ onShowAlert, showLoading, hideLoading }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [totalSupply, setTotalSupply] = useState('0');
  const [approvalThreshold, setApprovalThreshold] = useState(10);
  const [voteWeight, setVoteWeight] = useState(0);
  const [userVotes, setUserVotes] = useState({}); // Store user votes locally

  useEffect(() => {
    loadGames();
    loadTokenBalance();
    loadTotalSupply();
    loadApprovalThreshold();
  }, []);

  useEffect(() => {
    if (tokenBalance && totalSupply) {
      const weight = (Number(tokenBalance) / Number(totalSupply)) * 100;
      setVoteWeight(weight);
    }
  }, [tokenBalance, totalSupply]);

  const loadGames = async () => {
    try {
      showLoading('Loading games...');
      const provider = new BrowserProvider(window.ethereum);
      const allGames = await getAllGames(provider);
      const pendingGames = allGames.filter(game => !game.approved && !game.rejected);
      setGames(pendingGames);
      setLoading(false);
    } catch (error) {
      console.error('Error loading games:', error);
      setLoading(false);
    } finally {
      hideLoading();
    }
  };

  const loadTokenBalance = async () => {
    try {
      showLoading('Loading token balance...');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const windoge95Contract = getWindoge95Contract(provider);
      const balance = await windoge95Contract.balanceOf(address);
      setTokenBalance(formatEther(balance));
    } catch (error) {
      console.error('Error loading token balance:', error);
    } finally {
      hideLoading();
    }
  };

  const loadTotalSupply = async () => {
    try {
      showLoading('Loading total supply...');
      const provider = new BrowserProvider(window.ethereum);
      const windoge95Contract = getWindoge95Contract(provider);
      const supply = await windoge95Contract.totalSupply();
      setTotalSupply(formatEther(supply));
    } catch (error) {
      console.error('Error loading total supply:', error);
    } finally {
      hideLoading();
    }
  };

  const loadApprovalThreshold = async () => {
    try {
      showLoading('Loading approval threshold...');
      const provider = new BrowserProvider(window.ethereum);
      const threshold = await getApprovalThreshold(provider);
      setApprovalThreshold(Number(threshold.toString()));
    } catch (error) {
      console.error('Error loading approval threshold:', error);
    } finally {
      hideLoading();
    }
  };

  const handleVoteChange = (gameId, approve) => {
    setUserVotes(prevVotes => ({
      ...prevVotes,
      [gameId]: approve
    }));
  };

  const handleSubmitVotes = async () => {
    try {
      showLoading('Submitting votes...');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const gameIds = Object.keys(userVotes).map(id => parseInt(id));
      const approves = Object.values(userVotes);

      await batchVoteForGames(signer, gameIds, approves);

      showLoading('Refreshing games...');
      await loadGames();
      onShowAlert('Success', 'Votes submitted successfully.');
      setUserVotes({}); // Clear user votes after submission
    } catch (error) {
      console.error('Error submitting votes:', error);
      onShowAlert('Error', `Error submitting votes: ${error.message}`);
    } finally {
      hideLoading();
    }
  };

  if (loading) {
    return <div>Loading games...</div>;
  }

  return (
    <div className="dao-voting">
      <h2>DAO Voting</h2>
      <p>Your Token Balance: {tokenBalance} WIN95</p>
      <p>Your Vote Weight: {voteWeight.toFixed(2)}%</p>
      <p>Approval Threshold: {approvalThreshold}%</p>
      {games.map((game) => (
        <div key={game.id} className="game-vote-item">
          <h3>{game.title}</h3>
          <p>{game.description}</p>
          <p>Category: {game.category}</p>
          <p>Game Owner: {game.owner}</p>
          <p>Approval Votes: {(Number(game.approvalVotes) / 100).toFixed(2)}%</p>
          <p>Rejection Votes: {(Number(game.rejectionVotes) / 100).toFixed(2)}%</p>
          <label>
            <input
              type="radio"
              name={`vote-${game.id}`}
              value="approve"
              checked={userVotes[game.id] === true}
              onChange={() => handleVoteChange(game.id, true)}
            />
            Approve
          </label>
          <label>
            <input
              type="radio"
              name={`vote-${game.id}`}
              value="reject"
              checked={userVotes[game.id] === false}
              onChange={() => handleVoteChange(game.id, false)}
            />
            Reject
          </label>
        </div>
      ))}
      <button onClick={handleSubmitVotes} disabled={Object.keys(userVotes).length === 0}>
        Submit Votes
      </button>
    </div>
  );
}

export default DAOVoting;