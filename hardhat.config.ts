import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      accounts: {
        count: 5,
        accountsBalance: "10000000000000000000000000"
      }
    },
  },
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    }
  },
  gasReporter: {
    enabled: false,
    currency: 'USD',
    excludeContracts: ['./contracts/mock'],
    src: './contracts'
  },
};

export default config;
