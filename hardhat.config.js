require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("hardhat-tracer");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      forking: {
        url: process.env.RPC_URL
      },
      gas: 10000000,
      loggingEnabled: true,
      accounts: {
        count: 50, // Adjust this number as needed
      }
    },
  },
  paths: {
    artifacts: './src/artifacts',
  },
};