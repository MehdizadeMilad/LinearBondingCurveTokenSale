import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
const { BN } = require('@openzeppelin/test-helpers');

import { expect } from "chai";
import { ethers } from "hardhat";

import { parseEther, parseUnits, AddressLike, formatEther } from "ethers";


/**  Testing: 
 * Include unit tests to verify the correctness of your contract. 
 * Tests should cover token buying and selling scenarios, 
 *  ensuring that the token amounts are calculated correctly,  //TODO identify the formula
 *  and edge cases are properly handled. //TODO identify edge cases
 * */
describe("Special Token", function () {

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function initialize_amm_token() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const AMMToken = await ethers.getContractFactory("AMMToken");
    const amm_token = await AMMToken.deploy();

    return { AMMToken, amm_token, owner, otherAccount };
  }

  const get_eth_balance_of = async (_address: AddressLike) => (await ethers.provider.getBalance(_address))
  const ETH = (_n: String | Number) => new BN(parseEther(_n.toString()));


  describe("Init", function () {
    it("Should initialize with 0 total supply", async () => {
      const { amm_token } = await loadFixture(initialize_amm_token);

      expect(await amm_token.totalSupply()).to.equal(0);
    });

    it("Should set the right owner", async () => {
      const { amm_token, owner, otherAccount } = await loadFixture(initialize_amm_token);

      expect(await amm_token.owner()).to.equal(owner.address);
      expect(await amm_token.owner()).to.not.equal(otherAccount.address);
    });

    it("should prevent high gas prices [default is 200 GWEI - Experimental]", async () => {

      const { amm_token, owner, otherAccount } = await loadFixture(initialize_amm_token);

      await expect(
        otherAccount.sendTransaction({
          to: amm_token.target,
          value: parseEther("1"),
          gasPrice: parseUnits("201", "gwei"),
        })
      ).to.be.rejectedWith("Transaction gas price cannot exceed maximum gas price!");

    })

    it("should only allow the admin to change the gas price cap", async () => {

      const { amm_token, owner, otherAccount } = await loadFixture(initialize_amm_token);

      await expect(
        amm_token.connect(otherAccount).set_max_gas_price(parseUnits("800", "gwei"))
      ).to.be.rejectedWith("Only the owner can change max gas price!");

      // Change the cap to 200 GWEI from the default 400 GWEI
      await amm_token.set_max_gas_price(parseUnits("200", "gwei"));

      await otherAccount.sendTransaction({
        to: amm_token.target,
        value: parseEther("1"),
        gasPrice: parseUnits("200", "gwei"),
      })

      await expect(
        otherAccount.sendTransaction({
          to: amm_token.target,
          value: parseEther("1"),
          gasPrice: parseUnits("201", "gwei"),
        })
      ).to.be.rejectedWith("Transaction gas price cannot exceed maximum gas price!");
    })
  });


  describe("Buy", function () {

    it("should revert if deposited ETH is < 1", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );

      const _token_contract_address = amm_token.target;

      await expect(
        otherAccount.sendTransaction(
          { to: _token_contract_address }
        )
      ).to.be.revertedWith("deposit amount must be > 0!")

    })

    it("should reject underpriced deposit", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );

      const _initial_price = new BN(await amm_token.initial_price());

      // Try to buy underpriced
      await expect(
        otherAccount.sendTransaction({ to: amm_token.target, value: _initial_price.sub(new BN(1)).toString() })
      ).to.be.rejectedWith("deposit underpriced!")
    })

    it("Should allow buying Project Token by transferring ETH", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );
      const _token_contract_address = amm_token.target;

      //  Starting price
      const _initial_price = new BN(await amm_token.initial_price());
      expect(_initial_price).to.be.equal(ETH(1))

      // No one bought just yet
      expect(await get_eth_balance_of(_token_contract_address)).to.equal(0);

      // check buyer's balance before the purchase
      const _eoa_pre_buy_balance = await get_eth_balance_of(otherAccount.address)

      // Buy 1 token
      await otherAccount.sendTransaction({ to: _token_contract_address, value: ETH(1).toString() });

      //  Validate if the buyer's ETH balance is deducted
      expect(
        await get_eth_balance_of(otherAccount.address)
      ).to.be.lessThan(
        new BN(_eoa_pre_buy_balance).sub(ETH(1)) // 1 ETH + fee
      )

      // validate if the buyer's Token balance is increased
      expect(
        await amm_token.balanceOf(otherAccount.address)
      ).to.be.equal(parseEther("1"))

      // Confirm Token Contract ETH Balance (Reserve currency) is increased
      expect(await get_eth_balance_of(_token_contract_address)).to.equal(ETH(1));
    });

    it("Should emit Minted event at purchase", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );
      const _token_contract_address = amm_token.target;

      const _initial_price = new BN(await amm_token.initial_price());

      const _expected_tokens_to_mint = parseEther("1");
      const _expected_reserve_balance = new BN(parseEther("1"));

      // Buy 1 token
      await expect(
        otherAccount.sendTransaction({ to: _token_contract_address, value: _initial_price.toString() })
      ).to.emit(amm_token, "Minted")
        .withArgs
        (
          otherAccount.address,
          ETH(1).toString(),
          _expected_tokens_to_mint.toString(),
          _expected_reserve_balance.toString(),
          _expected_tokens_to_mint.toString(),
        )
    });

    it("should increase the price with each token sold", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );
      const _token_contract_address = amm_token.target;

      const _initial_price = new BN(await amm_token.initial_price());

      const _price_slope = new BN(await amm_token.price_slope())


      // the very first token 1 eth
      // second token 3 eth (1+2)
      // third token 6 eth (1+2+3)
      // forth token 10 eth (1 + 2 + 3 + 4)
      const _get_current_price = await amm_token.current_buy_price(ETH(10).toString());
      // expect(_get_current_price).to.be.equal(ETH(4))

      // TODO continue testing

    })

  });

  describe("Sell", function () {

    it("should trigger onTransferReceived", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );
      const _token_contract_address = amm_token.target;

      // Buy 1 token
      await otherAccount.sendTransaction({ to: _token_contract_address, value: ETH(1).toString() });
      // confirm 1 token bought
      expect(await amm_token.balanceOf(otherAccount.address)).to.be.equal(ETH(1))

      await expect(
        amm_token.connect(otherAccount).transferAndCall(
          _token_contract_address,
          ETH(1).toString()
        )).to.emit(amm_token, "Burned")

      // TODO continue after the price calculation is done.

    })
  });
});
