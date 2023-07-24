import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      accounts: {
        count: 5,
        accountsBalance: "10000000000000000000000000"
      }
    },
  },
  solidity: "0.8.19",
};

export default config;
