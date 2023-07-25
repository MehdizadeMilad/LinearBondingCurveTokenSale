import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
const { BN } = require('@openzeppelin/test-helpers');

import { expect } from "chai";
import { ethers } from "hardhat";

import { parseEther, parseUnits, AddressLike } from "ethers";


/**  Testing: 
 * Include unit tests to verify the correctness of your contract. 
 * Tests should cover token buying and selling scenarios, 
 *  ensuring that the token amounts are calculated correctly,
 *  and edge cases are properly handled. //TODO identify edge cases
 * */
describe("Special Token", function () {

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function initialize_amm_token() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, randomAccount] = await ethers.getSigners();

    const AMMToken = await ethers.getContractFactory("AMMToken");
    const amm_token = await AMMToken.deploy();

    return { AMMToken, amm_token, owner, otherAccount, randomAccount };
  }

  /** ------------------------------------ Helper functions  ------------------------------------ */
  const get_eth_balance_of = async (_address: AddressLike) => (await ethers.provider.getBalance(_address))
  const ETH = (_n: String | Number) => new BN(parseEther(_n.toString()));
  /** ------------------------------------ /Helper functions ----------------------------------- */


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
    it("should reject fractions", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );

      const _initial_price = new BN(await amm_token.INITIAL_PRICE()).add(ETH(0.5));
      const _token_contract_address = amm_token.target;

      await expect(
        otherAccount.sendTransaction({ to: _token_contract_address, value: _initial_price.toString() })
      ).to.be.rejectedWith("Fractions are not supported yet!")

      await expect(
        otherAccount.sendTransaction({
          to: _token_contract_address,
          value: ETH(1.5).toString()
        })
      ).to.be.revertedWith("Fractions are not supported yet!")

    })

    it("should increase the price of tokens linearly respecting n(n+1)/2 formula", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );

      // the first token costs 1 ETH
      expect(await amm_token.required_eth_to_buy_token(1)).to.be.equal(ETH(1))

      // ∑n=110n = (1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10) = 55 
      expect(await amm_token.required_eth_to_buy_token(10)).to.be.equal(ETH(55))
      expect(await amm_token.required_eth_to_buy_token(20)).to.be.equal(ETH(210))

      expect(
        await amm_token.amount_of_token_eth_buys(
          await amm_token.required_eth_to_buy_token(1)
        )).to.be.equal(1)

      expect(
        await amm_token.amount_of_token_eth_buys(
          await amm_token.required_eth_to_buy_token(20)
        )).to.be.equal(20)

      expect(
        await amm_token.amount_of_token_eth_buys(
          await amm_token.required_eth_to_buy_token(20)
        )).to.be.equal(20)
    })

    it("should increase the price with each token sold", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );

      const _token_contract_address = amm_token.target;

      // at the beginning 1 token costs 1 ETH
      expect(await amm_token.required_eth_to_buy_token(1)).to.be.equal(ETH(1))
      //  OR
      expect(
        await amm_token.amount_of_token_eth_buys(
          await amm_token.required_eth_to_buy_token(1)
        )).to.be.equal(1)

      // 2 tokens costs 3 ETH
      expect(await amm_token.required_eth_to_buy_token(2)).to.be.equal(ETH(3))

      // ∑n=110n = (1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10) = 55 
      expect(await amm_token.required_eth_to_buy_token(10)).to.be.equal(ETH(55))

      const _required_eth_to_buy_20_token = await amm_token.required_eth_to_buy_token(20);
      expect(_required_eth_to_buy_20_token).to.be.equal(ETH(210))

      const _amount_of_token_eth_can_buy = await amm_token.amount_of_token_eth_buys(_required_eth_to_buy_20_token)
      expect(_amount_of_token_eth_can_buy).to.be.equal(20)


      // After actually buying 1 token
      await otherAccount.sendTransaction({ to: _token_contract_address, value: (await amm_token.required_eth_to_buy_token(1)).toString() });

      // each token will now cost 2 ETH
      const _cost_of_buying_1_token_now = await amm_token.required_eth_to_buy_token(1);
      expect(_cost_of_buying_1_token_now).to.be.equal(ETH(2))

      // Buy 1 more token (2 in total)
      await otherAccount.sendTransaction(
        {
          to: _token_contract_address,
          value: (_cost_of_buying_1_token_now).toString()
        });

      // 2 token has been bought by {otherAccount}
      expect(await amm_token.balanceOf(otherAccount.address)).to.be.equal(ETH(2))

      // after the first 2 purchases, each token will cost 3 ETH
      expect(await amm_token.required_eth_to_buy_token(1)).to.be.equal(ETH(3));
    })

    it("should increase token balance of the buyer", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );

      const _token_contract_address = amm_token.target;

      expect(await get_eth_balance_of(_token_contract_address)).to.be.equal(0)

      // After actually buying 1 token
      await otherAccount.sendTransaction({ to: _token_contract_address, value: (await amm_token.required_eth_to_buy_token(1)).toString() });

      // 1 token has been bought by {otherAccount}
      expect(await amm_token.balanceOf(otherAccount.address)).to.be.equal(ETH(1))

      expect(await get_eth_balance_of(_token_contract_address)).to.be.equal(ETH(1))
    })

    it("should increase the reserve_balance after each ETH deposit/token bought", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );

      const _token_contract_address = amm_token.target;

      expect(
        await amm_token.reserve_balance()
      ).to.be.equal(0)

      // deposit 3 ETH
      await otherAccount.sendTransaction({ to: _token_contract_address, value: ETH(3).toString() });

      expect(
        await amm_token.reserve_balance()
      ).to.be.equal(ETH(3))
    })

    it("should allow a whale to purchase a big amount of tokens", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );

      const _token_contract_address = amm_token.target;

      const _token_to_buy = 1_000

      await otherAccount.sendTransaction(
        {
          to: _token_contract_address,
          value: (await amm_token.required_eth_to_buy_token(_token_to_buy)).toString()
        })

      expect(await amm_token.balanceOf(otherAccount.address)).to.be.equal(ETH(_token_to_buy))

      const _new_token_price = _token_to_buy + 1; // 1001
      expect(await amm_token.required_eth_to_buy_token(1)).to.be.equal(ETH(_new_token_price));
    })

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

    it("Should allow buying Project Token by transferring ETH", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );
      const _token_contract_address = amm_token.target;

      //  Starting price
      const _initial_price = new BN(await amm_token.INITIAL_PRICE());
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

      const _initial_price = new BN(await amm_token.INITIAL_PRICE());

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

    it("should revert if onTransferReceived is called by anyone except the AMM contract", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );

      await expect(amm_token.onTransferReceived(
        otherAccount.address,
        otherAccount.address,
        ETH(1).toString(),
        "0x00"
      )).to.revertedWith("Only this contract can receive tokens")
    })
  });

  describe("Sell", function () {

    it("should emit Burned event", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );
      const _token_contract_address = amm_token.target;

      // Buy 1 token
      await otherAccount.sendTransaction({ to: _token_contract_address, value: ETH(1).toString() });

      expect(await amm_token.balanceOf(otherAccount.address)).to.be.equal(ETH(1))

      await expect(
        amm_token.connect(otherAccount).transferAndCall(
          _token_contract_address,
          ETH(1).toString() // 1 Token
        )).to.emit(amm_token, "Burned").withArgs(ETH(1).toString(), ETH(1).toString())
    })

    it("should prevent selling a fraction of a token", async () => {
      const { amm_token, otherAccount, randomAccount } = await loadFixture(
        initialize_amm_token
      );
      const _token_contract_address = amm_token.target;

      const _required_eth_to_buy_20_token = await amm_token.required_eth_to_buy_token(20);

      // Buy 20 token
      await otherAccount.sendTransaction({ to: _token_contract_address, value: _required_eth_to_buy_20_token });
      expect(await amm_token.balanceOf(otherAccount.address)).to.be.equal(ETH(20))

      // Sell a fraction of tokens using approve
      await expect(
        amm_token.connect(otherAccount).approveAndCall(
          _token_contract_address,
          ETH(20).sub(new BN(1)).toString() // 19.99 Token
        )).to.revertedWith("Fractions are not supported yet!")

      // Sell a fraction of tokens using transfer
      await expect(
        amm_token.connect(otherAccount).transferAndCall(
          _token_contract_address,
          ETH(20).sub(new BN(1)).toString() // 19.99 Token
        )).to.revertedWith("Fractions are not supported yet!")
    })

    it("should refund ETH by transferring Token back to the smart contract", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );
      const _token_contract_address = amm_token.target;

      const _count_of_token_to_purchase_raw = 10;
      const _required_eth_to_buy_tokens_in_wei = await amm_token.required_eth_to_buy_token(
        _count_of_token_to_purchase_raw
      );

      // Buy 10 token
      await otherAccount.sendTransaction({
        to: _token_contract_address,
        value: (_required_eth_to_buy_tokens_in_wei).toString()
      });

      // Confirm token purchase
      expect(await amm_token.balanceOf(otherAccount.address)).to.be.equal(ETH(10))
      expect(await amm_token.reserve_balance()).to.be.equal(_required_eth_to_buy_tokens_in_wei)

      // Sell all tokens
      await expect(
        amm_token.connect(otherAccount).transferAndCall(
          _token_contract_address,
          ETH(_count_of_token_to_purchase_raw).toString()
        )).to.emit(amm_token, "Burned")
        .withArgs(
          ETH(_count_of_token_to_purchase_raw).toString(),
          _required_eth_to_buy_tokens_in_wei
        )

      // confirm token sale
      expect(await amm_token.balanceOf(otherAccount.address)).to.be.equal(0)
      expect(await amm_token.totalSupply()).to.be.equal(0)
      expect(await amm_token.reserve_balance()).to.be.equal(0)
      expect(await get_eth_balance_of(_token_contract_address)).to.be.equal(0)
    })

    it("should revert if onApprovalReceived is called by anyone except the Project Token contract", async () => {
      const { amm_token, otherAccount } = await loadFixture(
        initialize_amm_token
      );

      await expect(amm_token.onApprovalReceived(
        otherAccount.address,
        ETH(1).toString(),
        "0x00"
      )).to.revertedWith("Only this contract can receive tokens")
    })

    it("should sell by approve", async () => {
      const { amm_token, otherAccount, randomAccount } = await loadFixture(
        initialize_amm_token
      );
      const _token_contract_address = amm_token.target;

      const _buyer_eth_balance_before_purchase = await get_eth_balance_of(otherAccount.address)

      // Buy 1 token
      await otherAccount.sendTransaction({ to: _token_contract_address, value: ETH(1).toString() });

      const _buyer_eth_balance_after_purchase = await get_eth_balance_of(otherAccount.address)
      expect(_buyer_eth_balance_before_purchase).to.be.greaterThan(_buyer_eth_balance_after_purchase)


      expect(await amm_token.balanceOf(otherAccount.address)).to.be.equal(ETH(1))

      // Approve spender to transfer tokens and then execute a callback on `spender`.
      await expect(
        amm_token.connect(otherAccount).approveAndCall(
          _token_contract_address,
          ETH(1).toString() // 1 Token
        )).to.emit(amm_token, "Burned").withArgs(ETH(1).toString(), ETH(1).toString())


      // confirm token sale
      expect(await amm_token.balanceOf(otherAccount.address)).to.be.equal(0)
      expect(await amm_token.totalSupply()).to.be.equal(0)
      expect(await amm_token.reserve_balance()).to.be.equal(0)
      expect(await get_eth_balance_of(_token_contract_address)).to.be.equal(0)
      expect(await get_eth_balance_of(otherAccount.address)).to.be.gt(_buyer_eth_balance_after_purchase)
    })

    it("should only allow approving the Project Token contract only", async () => {

      const { amm_token, otherAccount, randomAccount } = await loadFixture(
        initialize_amm_token
      );

      await expect(
        amm_token.connect(otherAccount).approveAndCall(
          randomAccount.address,
          ETH(1).toString() // 1 Token
        )).to.be.revertedWith("ERC1363: approve a non contract address");
    })
  });
});
