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
    {}

    /** ------------------------------------ External Functions ------------------------------------ */

    /**
     * Buy/Mint Project Token with ETH
     */
    receive() external payable {
        enforce_normal_gas_price();

        uint256 _deposit_amount = msg.value;
        require(_deposit_amount > 0, "deposit amount must be > 0!");

        uint256 _current_total_supply = totalSupply();

        uint256 _count_of_token_to_buy = how_many_token_eth_can_buy(
            totalSupply(),
            _deposit_amount
        );

        uint256 _current_buy_price = token_to_ETH(
            totalSupply(),
            _count_of_token_to_buy
        );

        require(_deposit_amount >= _current_buy_price, "deposit underpriced!");

        uint256 tokensToMint = _count_of_token_to_buy * 1e18;

        reserve_balance += _current_buy_price;

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

    /** ------------------------------------ External View Helper Functions ------------------------------------ */

    function required_eth_to_buy_token(
        uint256 _token_to_buy
    ) external view returns (uint256) {
        return token_to_ETH(totalSupply(), _token_to_buy);
    }

    function amount_of_token_eth_buys(
        uint256 _final_cost
    ) external view returns (uint256) {
        return how_many_token_eth_can_buy(totalSupply(), _final_cost);
    }
}
