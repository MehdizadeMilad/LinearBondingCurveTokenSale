// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.19;

/**
 * @title Possible solution to mitigate front runners
 * @notice Bonding curves enable front-running attacks,
 *  where traders exploit foreknowledge of pending orders to place their own orders with higher gas,
 *  cutting ahead of the original order for profits.
 */
contract PreventFrontRunners {
    /** ------------------------------------ State variables ------------------------------------ */

    address private immutable _owner;
    uint256 public max_gas_price = 100 gwei; // Adjustable value

    /** ------------------------------------ Constructor ------------------------------------ */
    constructor() {
        _owner = address(msg.sender);
    }

    /** ------------------------------------ External functions ------------------------------------ */

    /**
     * try to mitigate front-running with an explicit cap on {max_gas_price} traders are allowed to offer.
     * @param gas_price the cap for the normal gas price
     */
    function set_max_gas_price(uint256 gas_price) external only_owner {
        max_gas_price = gas_price;
    }

    /** ------------------------------------ Internal functions ------------------------------------ */

    /**
     * Traders are limited to set their explicit gas price below the {max_gas_price}
     */
    function enforce_normal_gas_price() internal view {
        require(
            tx.gasprice <= max_gas_price,
            "Transaction gas price cannot exceed maximum gas price!"
        );
    }

    /** ------------------------------------ Modifiers ------------------------------------ */

    modifier only_owner() {
        require(
            msg.sender == _owner,
            "Only the owner can change max gas price!"
        );
        _;
    }
}
