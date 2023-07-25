// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ERC1363} from "erc-payable-token/contracts/token/ERC1363/ERC1363.sol";
import {IERC1363Receiver} from "erc-payable-token/contracts/token/ERC1363/IERC1363Receiver.sol";
import {IERC1363Spender} from "erc-payable-token/contracts/token/ERC1363/IERC1363Spender.sol";

import {ICustomErrors} from "./interfaces/ICustomErrors.sol";
import {IEvents} from "./interfaces/IEvents.sol";
import {LinearBundingCurve} from "./modules/LinearBundingCurve.sol";

import {PreventFrontRunners} from "./modules/PreventFrontRunners.sol";

contract AMMToken is
    Ownable,
    ERC1363,
    LinearBundingCurve,
    PreventFrontRunners,
    IERC1363Receiver,
    IERC1363Spender,
    ICustomErrors,
    IEvents
{
    /** ------------------------------------ State variables ------------------------------------ */

    uint256 public reserveBalance = 0; // Total ETH received during the token sale

    /** ------------------------------------ Constructor ------------------------------------ */
    constructor()
        /**
         * Token Parameters
         */
        ERC20("Mock Project Token", "MPT")
    {}

    /** ------------------------------------ Administration Functions ------------------------------------ */

    /**
     * an experimental method to prevent frunt-runners - by setting a cap for gas price
     *
     * @notice risk disclaimer: at the period of network congestion, tx's might not go through
     * @notice  and requires the admin to increase the gas price limit.
     * @param gasPrice the cap allowed for the gas price
     */
    function setMaxGasPriceAllowed(uint256 gasPrice) external onlyOwner {
        setMaxGasPrice(gasPrice);
    }

    /** ------------------------------------ External Functions ------------------------------------ */

    /**
     * Buy/Mint Project Token with ETH
     */
    receive() external payable {
        enforceNormalGasPrice();

        uint256 _depositAmount = msg.value;
        require(_depositAmount > 0, "deposit amount must be > 0!");
        enforceNotFraction(_depositAmount);

        uint256 _currentTotalSupply = totalSupply();

        uint256 _countOfTokenToBuy = howManyTokenEthCanBuy(
            totalSupply(),
            _depositAmount
        );

        uint256 _currentBuyPrice = tokenToEthBuy(
            totalSupply(),
            _countOfTokenToBuy
        );

        uint256 tokensToMint = _countOfTokenToBuy * 1e18;

        reserveBalance += _currentBuyPrice;

        emit Minted(
            msg.sender,
            _depositAmount,
            tokensToMint,
            reserveBalance,
            _currentTotalSupply + tokensToMint
        );
        // Mint and transfer the tokens to the buyer
        _mint(msg.sender, tokensToMint);
    }

    /**
     * Sell/Burn Project Token and return ETH (with current price)
     */
    function onTransferReceived(
        address spender,
        address sender, //TODO what is the use of this address?
        uint256 amount,
        bytes calldata data
    )
        external
        override
        isNotFractionOfToken(amount)
        onlyThisContractIsReceiver
        returns (bytes4)
    {
        processSale(spender, sender, amount, data);
        return IERC1363Receiver.onTransferReceived.selector;
    }

    /**
     * Sell/Burn Project Token and return ETH (with current price)
     * Spend functionality of ERC20
     */
    function onApprovalReceived(
        address sender,
        uint256 amount,
        bytes calldata data
    )
        external
        override
        isNotFractionOfToken(amount)
        onlyThisContractIsReceiver
        returns (bytes4)
    {
        transferFrom(sender, address(this), amount);

        processSale(sender, address(0), amount, data);

        return IERC1363Spender.onApprovalReceived.selector;
    }

    function processSale(
        address spender,
        address sender, //TODO what is the use of this address?
        uint256 amount,
        bytes calldata data
    ) private {
        uint256 _ethToReturn = tokenToEthSell(
            totalSupply(),
            amount // in WEI
        );

        reserveBalance -= _ethToReturn;

        emit Burned(amount, _ethToReturn);

        _burn(address(this), amount);

        (bool success, ) = spender.call{value: _ethToReturn}("");
        require(success, "Failed to send ETH back to the seller");
    }

    /** ------------------------------------ External View Helper Functions ------------------------------------ */

    function requiredEthToBuyToken(
        uint256 tokenToBuy
    ) external view returns (uint256) {
        return tokenToEthBuy(totalSupply(), tokenToBuy);
    }

    function amountOfTokenEthCanBuy(
        uint256 finalCost
    ) external view returns (uint256) {
        return howManyTokenEthCanBuy(totalSupply(), finalCost);
    }

    /** ------------------------------------------- Modifiers -------------------------------------------------- */

    modifier onlyThisContractIsReceiver() {
        require(
            msg.sender == address(this),
            "Only this contract can receive tokens"
        );
        _;
    }

    /**
     * Until proper handling of decimal points are not implemented, fractions are not supported.
     * @param amount the amount of ETH or Token in WEI
     */
    modifier isNotFractionOfToken(uint256 amount) {
        enforceNotFraction(amount);
        _;
    }

    /**
     * Until proper handling of decimal points are not implemented, fractions are not supported.
     * @param amount the amount of ETH or Token in WEI
     */
    function enforceNotFraction(uint256 amount) private pure {
        require(amount % 1 ether == 0, "Fractions are not supported yet!");
    }
}
