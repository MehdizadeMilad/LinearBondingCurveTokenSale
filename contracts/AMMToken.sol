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

    uint256 public reserve_balance = 0; // Total ETH received during the token sale

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
        enforceNotFraction(_deposit_amount);

        uint256 _current_total_supply = totalSupply();

        uint256 _count_of_token_to_buy = how_many_token_eth_can_buy(
            totalSupply(),
            _deposit_amount
        );

        uint256 _current_buy_price = token_to_eth_buy(
            totalSupply(),
            _count_of_token_to_buy
        );

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
        uint256 _eth_to_return = token_to_eth_sell(
            totalSupply(),
            amount // in WEI
        );

        reserve_balance -= _eth_to_return;

        emit Burned(amount, _eth_to_return);

        _burn(address(this), amount);

        (bool success, ) = spender.call{value: _eth_to_return}("");
        require(success, "Failed to send ETH back to the seller"); //TODO try to cover this in test
    }

    /** ------------------------------------ External View Helper Functions ------------------------------------ */

    function required_eth_to_buy_token(
        uint256 _token_to_buy
    ) external view returns (uint256) {
        return token_to_eth_buy(totalSupply(), _token_to_buy);
    }

    function amount_of_token_eth_buys(
        uint256 _final_cost
    ) external view returns (uint256) {
        return how_many_token_eth_can_buy(totalSupply(), _final_cost);
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
