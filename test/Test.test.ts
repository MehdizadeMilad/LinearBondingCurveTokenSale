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
  async function initializeAmmToken() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, randomAccount] = await ethers.getSigners();

    const AMMToken = await ethers.getContractFactory("AMMToken");
    const ammToken = await AMMToken.deploy();

    const ammContractAddress = ammToken.target;

    return { AMMToken, ammToken, ammContractAddress, owner, otherAccount, randomAccount };
  }

  /** ------------------------------------ Helper functions  ------------------------------------ */
  const getEthBalanceOf = async (_address: AddressLike) => (await ethers.provider.getBalance(_address))
  const ETH = (_n: String | Number) => new BN(parseEther(_n.toString()));
  /** ------------------------------------ /Helper functions ----------------------------------- */


  describe("Init", function () {
    it("Should initialize with 0 total supply", async () => {
      const { ammToken } = await loadFixture(initializeAmmToken);

      expect(await ammToken.totalSupply()).to.equal(0);
    });

    it("Should set the right owner", async () => {
      const { ammToken, owner, otherAccount } = await loadFixture(initializeAmmToken);

      expect(await ammToken.owner()).to.equal(owner.address);
      expect(await ammToken.owner()).to.not.equal(otherAccount.address);
    });

    it("should prevent high gas prices [default is 200 GWEI - Experimental]", async () => {

      const { ammContractAddress, otherAccount } = await loadFixture(initializeAmmToken);

      await expect(
        otherAccount.sendTransaction({
          to: ammContractAddress,
          value: parseEther("1"),
          gasPrice: parseUnits("201", "gwei"),
        })
      ).to.be.rejectedWith("Transaction gas price cannot exceed maximum gas price!");

    })

    it("should only allow the admin to change the gas price cap", async () => {

      const { ammToken, ammContractAddress, otherAccount } = await loadFixture(initializeAmmToken);

      await expect(
        ammToken.connect(otherAccount).setMaxGasPriceAllowed(parseUnits("800", "gwei"))
      ).to.be.rejectedWith("Ownable: caller is not the owner");

      // Change the cap to 200 GWEI from the default 400 GWEI
      await ammToken.setMaxGasPriceAllowed(parseUnits("200", "gwei"));

      await otherAccount.sendTransaction({
        to: ammContractAddress,
        value: parseEther("1"),
        gasPrice: parseUnits("200", "gwei"),
      })

      await expect(
        otherAccount.sendTransaction({
          to: ammContractAddress,
          value: parseEther("1"),
          gasPrice: parseUnits("201", "gwei"),
        })
      ).to.be.rejectedWith("Transaction gas price cannot exceed maximum gas price!");
    })
  });

  describe("Buy", function () {
    it("should reject fractions", async () => {
      const { ammToken, ammContractAddress, otherAccount } = await loadFixture(
        initializeAmmToken
      );

      const _initialPrice = new BN(await ammToken.INITIAL_PRICE()).add(ETH(0.5));

      await expect(
        otherAccount.sendTransaction({ to: ammContractAddress, value: _initialPrice.toString() })
      ).to.be.rejectedWith("Fractions are not supported yet!")

      await expect(
        otherAccount.sendTransaction({
          to: ammContractAddress,
          value: ETH(1.5).toString()
        })
      ).to.be.revertedWith("Fractions are not supported yet!")

    })

    it("should increase the price of tokens linearly respecting n(n+1)/2 formula", async () => {
      const { ammToken } = await loadFixture(
        initializeAmmToken
      );

      // the first token costs 1 ETH
      expect(await ammToken.requiredEthToBuyToken(1)).to.be.equal(ETH(1))

      // ∑n=110n = (1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10) = 55 
      expect(await ammToken.requiredEthToBuyToken(10)).to.be.equal(ETH(55))
      expect(await ammToken.requiredEthToBuyToken(20)).to.be.equal(ETH(210))

      expect(
        await ammToken.amountOfTokenEthCanBuy(
          await ammToken.requiredEthToBuyToken(1)
        )).to.be.equal(1)

      expect(
        await ammToken.amountOfTokenEthCanBuy(
          await ammToken.requiredEthToBuyToken(20)
        )).to.be.equal(20)

      expect(
        await ammToken.amountOfTokenEthCanBuy(
          await ammToken.requiredEthToBuyToken(20)
        )).to.be.equal(20)
    })

    it("should increase the price with each token sold", async () => {
      const { ammToken, ammContractAddress, otherAccount } = await loadFixture(
        initializeAmmToken
      );

      // at the beginning 1 token costs 1 ETH
      expect(await ammToken.requiredEthToBuyToken(1)).to.be.equal(ETH(1))
      //  OR
      expect(
        await ammToken.amountOfTokenEthCanBuy(
          await ammToken.requiredEthToBuyToken(1)
        )).to.be.equal(1)

      // 2 tokens costs 3 ETH
      expect(await ammToken.requiredEthToBuyToken(2)).to.be.equal(ETH(3))

      // ∑n=110n = (1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10) = 55 
      expect(await ammToken.requiredEthToBuyToken(10)).to.be.equal(ETH(55))

      const _requiredEthToBuy20Token = await ammToken.requiredEthToBuyToken(20);
      expect(_requiredEthToBuy20Token).to.be.equal(ETH(210))

      const _amount_of_token_eth_can_buy = await ammToken.amountOfTokenEthCanBuy(_requiredEthToBuy20Token)
      expect(_amount_of_token_eth_can_buy).to.be.equal(20)


      // After actually buying 1 token
      await otherAccount.sendTransaction({ to: ammContractAddress, value: (await ammToken.requiredEthToBuyToken(1)).toString() });

      // each token will now cost 2 ETH
      const _cost_of_buying_1_token_now = await ammToken.requiredEthToBuyToken(1);
      expect(_cost_of_buying_1_token_now).to.be.equal(ETH(2))

      // Buy 1 more token (2 in total)
      await otherAccount.sendTransaction(
        {
          to: ammContractAddress,
          value: (_cost_of_buying_1_token_now).toString()
        });

      // 2 token has been bought by {otherAccount}
      expect(await ammToken.balanceOf(otherAccount.address)).to.be.equal(ETH(2))

      // after the first 2 purchases, each token will cost 3 ETH
      expect(await ammToken.requiredEthToBuyToken(1)).to.be.equal(ETH(3));
    })

    it("should increase token balance of the buyer", async () => {
      const { ammToken, ammContractAddress, otherAccount } = await loadFixture(
        initializeAmmToken
      );


      expect(await getEthBalanceOf(ammContractAddress)).to.be.equal(0)

      // After actually buying 1 token
      await otherAccount.sendTransaction({ to: ammContractAddress, value: (await ammToken.requiredEthToBuyToken(1)).toString() });

      // 1 token has been bought by {otherAccount}
      expect(await ammToken.balanceOf(otherAccount.address)).to.be.equal(ETH(1))

      expect(await getEthBalanceOf(ammContractAddress)).to.be.equal(ETH(1))
    })

    it("should increase the reserveBalance after each ETH deposit/token bought", async () => {
      const { ammToken, ammContractAddress, otherAccount } = await loadFixture(
        initializeAmmToken
      );

      expect(
        await ammToken.reserveBalance()
      ).to.be.equal(0)

      // deposit 3 ETH
      await otherAccount.sendTransaction({ to: ammContractAddress, value: ETH(3).toString() });

      expect(
        await ammToken.reserveBalance()
      ).to.be.equal(ETH(3))
    })

    it("should allow a whale to purchase a big amount of tokens", async () => {
      const { ammToken, ammContractAddress, otherAccount } = await loadFixture(
        initializeAmmToken
      );

      const _token_to_buy = 1_000

      await otherAccount.sendTransaction(
        {
          to: ammContractAddress,
          value: (await ammToken.requiredEthToBuyToken(_token_to_buy)).toString()
        })

      expect(await ammToken.balanceOf(otherAccount.address)).to.be.equal(ETH(_token_to_buy))

      const _new_token_price = _token_to_buy + 1; // 1001
      expect(await ammToken.requiredEthToBuyToken(1)).to.be.equal(ETH(_new_token_price));
    })

    it("should revert if deposited ETH is < 1", async () => {
      const { ammContractAddress, otherAccount } = await loadFixture(
        initializeAmmToken
      );

      await expect(
        otherAccount.sendTransaction(
          { to: ammContractAddress }
        )
      ).to.be.revertedWith("deposit amount must be > 0!")

    })

    it("Should allow buying Project Token by transferring ETH", async () => {
      const { ammToken, ammContractAddress, otherAccount } = await loadFixture(
        initializeAmmToken
      );

      //  Starting price
      const _initialPrice = new BN(await ammToken.INITIAL_PRICE());
      expect(_initialPrice).to.be.equal(ETH(1))

      // No one bought just yet
      expect(await getEthBalanceOf(ammContractAddress)).to.equal(0);

      // check buyer's balance before the purchase
      const _eoa_pre_buy_balance = await getEthBalanceOf(otherAccount.address)

      // Buy 1 token
      await otherAccount.sendTransaction({ to: ammContractAddress, value: ETH(1).toString() });

      //  Validate if the buyer's ETH balance is deducted
      expect(
        await getEthBalanceOf(otherAccount.address)
      ).to.be.lessThan(
        new BN(_eoa_pre_buy_balance).sub(ETH(1)) // 1 ETH + fee
      )

      // validate if the buyer's Token balance is increased
      expect(
        await ammToken.balanceOf(otherAccount.address)
      ).to.be.equal(parseEther("1"))

      // Confirm Token Contract ETH Balance (Reserve currency) is increased
      expect(await getEthBalanceOf(ammContractAddress)).to.equal(ETH(1));
    });

    it("Should emit Minted event at purchase", async () => {
      const { ammToken, ammContractAddress, otherAccount } = await loadFixture(
        initializeAmmToken
      );

      const _initialPrice = new BN(await ammToken.INITIAL_PRICE());

      const _expectedTokensToMint = parseEther("1");
      const _expectedReserveBalance = new BN(parseEther("1"));

      // Buy 1 token
      await expect(
        otherAccount.sendTransaction({ to: ammContractAddress, value: _initialPrice.toString() })
      ).to.emit(ammToken, "Minted")
        .withArgs
        (
          otherAccount.address,
          ETH(1).toString(),
          _expectedTokensToMint.toString(),
          _expectedReserveBalance.toString(),
          _expectedTokensToMint.toString(),
        )
    });

    it("should revert if onTransferReceived is called by anyone except the AMM contract", async () => {
      const { ammToken, otherAccount } = await loadFixture(
        initializeAmmToken
      );

      await expect(ammToken.onTransferReceived(
        otherAccount.address,
        otherAccount.address,
        ETH(1).toString(),
        "0x00"
      )).to.revertedWith("Only this contract can receive tokens")
    })
  });

  describe("Sell", function () {

    it("should emit Burned event", async () => {
      const { ammToken, ammContractAddress, otherAccount } = await loadFixture(
        initializeAmmToken
      );

      // Buy 1 token
      await otherAccount.sendTransaction({ to: ammContractAddress, value: ETH(1).toString() });

      expect(await ammToken.balanceOf(otherAccount.address)).to.be.equal(ETH(1))

      await expect(
        ammToken.connect(otherAccount).transferAndCall(
          ammContractAddress,
          ETH(1).toString() // 1 Token
        )).to.emit(ammToken, "Burned").withArgs(ETH(1).toString(), ETH(1).toString())
    })

    it("should prevent selling a fraction of a token", async () => {
      const { ammToken, ammContractAddress, otherAccount } = await loadFixture(
        initializeAmmToken
      );

      const _requiredEthToBuy20Token = await ammToken.requiredEthToBuyToken(20);

      // Buy 20 token
      await otherAccount.sendTransaction({ to: ammContractAddress, value: _requiredEthToBuy20Token });
      expect(await ammToken.balanceOf(otherAccount.address)).to.be.equal(ETH(20))

      // Sell a fraction of tokens using approve
      await expect(
        ammToken.connect(otherAccount).approveAndCall(
          ammContractAddress,
          ETH(20).sub(new BN(1)).toString() // 19.99 Token
        )).to.revertedWith("Fractions are not supported yet!")

      // Sell a fraction of tokens using transfer
      await expect(
        ammToken.connect(otherAccount).transferAndCall(
          ammContractAddress,
          ETH(20).sub(new BN(1)).toString() // 19.99 Token
        )).to.revertedWith("Fractions are not supported yet!")
    })

    it("should refund ETH by transferring Token back to the smart contract", async () => {
      const { ammToken, otherAccount } = await loadFixture(
        initializeAmmToken
      );
      const ammContractAddress = ammToken.target;

      const _countOfTokenToPurchaseRaw = 10;
      const _requiredEthToBuyTokensInWei = await ammToken.requiredEthToBuyToken(
        _countOfTokenToPurchaseRaw
      );

      // Buy 10 token
      await otherAccount.sendTransaction({
        to: ammContractAddress,
        value: (_requiredEthToBuyTokensInWei).toString()
      });

      // Confirm token purchase
      expect(await ammToken.balanceOf(otherAccount.address)).to.be.equal(ETH(10))
      expect(await ammToken.reserveBalance()).to.be.equal(_requiredEthToBuyTokensInWei)

      // Sell all tokens
      await expect(
        ammToken.connect(otherAccount).transferAndCall(
          ammContractAddress,
          ETH(_countOfTokenToPurchaseRaw).toString()
        )).to.emit(ammToken, "Burned")
        .withArgs(
          ETH(_countOfTokenToPurchaseRaw).toString(),
          _requiredEthToBuyTokensInWei
        )

      // confirm token sale
      expect(await ammToken.balanceOf(otherAccount.address)).to.be.equal(0)
      expect(await ammToken.totalSupply()).to.be.equal(0)
      expect(await ammToken.reserveBalance()).to.be.equal(0)
      expect(await getEthBalanceOf(ammContractAddress)).to.be.equal(0)
    })

    it("should revert if onApprovalReceived is called by anyone except the Project Token contract", async () => {
      const { ammToken, otherAccount } = await loadFixture(
        initializeAmmToken
      );

      await expect(ammToken.onApprovalReceived(
        otherAccount.address,
        ETH(1).toString(),
        "0x00"
      )).to.revertedWith("Only this contract can receive tokens")
    })

    it("should sell by approve", async () => {
      const { ammToken, ammContractAddress, otherAccount } = await loadFixture(
        initializeAmmToken
      );

      const _buyerEthBalanceBeforePurchase = await getEthBalanceOf(otherAccount.address)

      // Buy 1 token
      await otherAccount.sendTransaction({ to: ammContractAddress, value: ETH(1).toString() });

      const _buyerEthBalanceAfterPurchase = await getEthBalanceOf(otherAccount.address)
      expect(_buyerEthBalanceBeforePurchase).to.be.greaterThan(_buyerEthBalanceAfterPurchase)


      expect(await ammToken.balanceOf(otherAccount.address)).to.be.equal(ETH(1))

      // Approve spender to transfer tokens and then execute a callback on `spender`.
      await expect(
        ammToken.connect(otherAccount).approveAndCall(
          ammContractAddress,
          ETH(1).toString() // 1 Token
        )).to.emit(ammToken, "Burned").withArgs(ETH(1).toString(), ETH(1).toString())


      // confirm token sale
      expect(await ammToken.balanceOf(otherAccount.address)).to.be.equal(0)
      expect(await ammToken.totalSupply()).to.be.equal(0)
      expect(await ammToken.reserveBalance()).to.be.equal(0)
      expect(await getEthBalanceOf(ammContractAddress)).to.be.equal(0)
      expect(await getEthBalanceOf(otherAccount.address)).to.be.gt(_buyerEthBalanceAfterPurchase)
    })

    it("should only allow approving the Project Token contract only", async () => {

      const { ammToken, otherAccount, randomAccount } = await loadFixture(
        initializeAmmToken
      );

      await expect(
        ammToken.connect(otherAccount).approveAndCall(
          randomAccount.address,
          ETH(1).toString() // 1 Token
        )).to.be.revertedWith("ERC1363: approve a non contract address");
    })
  });
});
