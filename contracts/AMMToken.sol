// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ERC1363} from "erc-payable-token/contracts/token/ERC1363/ERC1363.sol";
import {IERC1363Receiver} from "erc-payable-token/contracts/token/ERC1363/IERC1363Receiver.sol";
import {IERC1363Spender} from "erc-payable-token/contracts/token/ERC1363/IERC1363Spender.sol";

import {ICustomErrors} from "./interfaces/ICustomErrors.sol";
import {IEvents} from "./interfaces/IEvents.sol";
import {LinearBundingCurve} from "./modules/LinearBundingCurve.sol";

import {PreventFrontRunners} from "./modules/PreventFrontRunners.sol";

// import "hardhat/console.sol";

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

    uint256 reserve_balance = 0; // Total ETH received during the token sale

    /** ------------------------------------ Constructor ------------------------------------ */
    constructor()
        /**
         * Token Parameters
         */
        ERC20("Mock Project Token", "MPT")
        /**
         * Curve Parameters
         */
        LinearBundingCurve(
            1 ether, // Initial price of tokens in ETH (e.g., 0.001 ETH)
            1 ether // Price increase per token sold (e.g., 0.0001 ETH)
        )
    {}

    /** ------------------------------------ External Functions ------------------------------------ */

    /**
     * Buy/Mint Project Token with ETH
     */
    receive() external payable {
        // TODO also consider the fractional purchase - prb/math.

        enforce_normal_gas_price();

        uint256 _deposit_amount = msg.value;
        require(_deposit_amount > 0, "deposit amount must be > 0!");

        uint256 _current_total_supply = totalSupply();

        uint256 _current_buy_price = calculate_buy_price(
            reserve_balance,
            _deposit_amount,
            _current_total_supply
        );

        require(_deposit_amount >= _current_buy_price, "deposit underpriced!");

        //TODO to be adjusted
        uint256 tokensToMint = (_deposit_amount / _current_buy_price) * 1e18;

        reserve_balance += _deposit_amount;

        emit Minted(
            msg.sender,
            _deposit_amount,
            tokensToMint,
            reserve_balance,
            _current_total_supply + tokensToMint
        );
        // Mint and transfer the tokens to the buyer
        _mint(msg.sender, tokensToMint);
    }

    /**
     * Sell/Burn Project Token and return ETH (with current price)
     */
    function onTransferReceived(
        address spender,
        address sender,
        uint256 amount,
        bytes calldata data
    ) external override returns (bytes4) {
        require(
            msg.sender == address(this),
            "Only this contract can receive tokens"
        );

        uint256 _current_sell_price = calculate_sell_price();
        uint256 eth_to_return = (amount / 1e18) * (_current_sell_price);

        // TODO also consider the fractional purchase - prb/math.

        _burn(address(this), amount);

        reserve_balance -= eth_to_return;

        emit Burned(amount, eth_to_return);

        (bool success, ) = spender.call{value: eth_to_return}("");
        require(success, "Failed to send ETH back to the seller");

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
    ) external override returns (bytes4) {
        revert NotImplemented();
    }

    /** ------------------------------------ External View Functions ------------------------------------ */

    function current_buy_price(
        uint256 _eth_deposit_amount
    ) public view returns (uint256) {
        return 1 ether;
            // calculate_buy_price(
            //     reserve_balance,
            //     _eth_deposit_amount,
            //     totalSupply()
            // );
    }
}
