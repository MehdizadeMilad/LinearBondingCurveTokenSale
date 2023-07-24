import { ethers } from "hardhat";

async function main() {
  const amm_token = await ethers.deployContract("AMMToken");

  console.log(`amm_token deployed at ${amm_token.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
