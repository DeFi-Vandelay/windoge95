import React, { useState, useEffect, useCallback } from 'react';
import { BrowserProvider } from 'ethers';
import { getTokenBalance } from '../contractInteraction';

function WalletConnection() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [tokenBalance, setTokenBalance] = useState('0');

  const updateTokenBalance = useCallback(async (address) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const balance = await getTokenBalance(provider, address);
      setTokenBalance(balance);
    } catch (error) {
      console.error('Error updating token balance:', error);
    }
  }, []);

  const checkWalletConnection = useCallback(async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          await updateTokenBalance(accounts[0]);
        } else {
          setIsConnected(false);
          setWalletAddress('');
          setTokenBalance('0');
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  }, [updateTokenBalance]);

  useEffect(() => {
    checkWalletConnection();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          updateTokenBalance(accounts[0]);
        } else {
          setIsConnected(false);
          setWalletAddress('');
          setTokenBalance('0');
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, [checkWalletConnection, updateTokenBalance]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
        setIsConnected(true);
        await updateTokenBalance(accounts[0]);
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    } else {
      alert('Please install MetaMask to use this feature.');
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setWalletAddress('');
    setTokenBalance('0');
  };

  return (
    <div className="wallet-connection">
      {isConnected ? (
        <>
          <div className="wallet-info">
            <span>Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            <span>Balance: {parseFloat(tokenBalance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})} WIN95</span>
          </div>
          <button onClick={disconnectWallet} className="disconnect-button">Disconnect</button>
        </>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}
    </div>
  );
}

export default WalletConnection;