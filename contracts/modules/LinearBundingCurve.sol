// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;
import "hardhat/console.sol";

contract LinearBundingCurve {
    /** ------------------------------------ State variables ------------------------------------ */

    uint256 public initial_price = 0; // Initial price of tokens in ETH (e.g., 0.001 ETH)
    uint256 public price_slope = 0; // Price increase per token sold (e.g., 0.0001 ETH)

    /** ------------------------------------ Constructor ------------------------------------ */
    constructor(uint256 _initial_price, uint256 _price_slope) {
        initial_price = _initial_price;

        // require(_price_slope > 0, "_price_slope > 0!"); //V1: make the input parameteric and Validate them
        price_slope = _price_slope;
    }

    /** ------------------------------------ Internal functions ------------------------------------ */
    /**
     * Calculate how many token can be purchased with the deposited ETH using Linear Bunding Curve
     * @param _reserve_supply the current supply of the Reserve currency
     * @param _deposit_amount the amount of the deposit in ETH
     * @param _token_supply the current toke supply
     *
     */
    function calculate_buy_price(
        uint256 _reserve_supply,
        uint256 _deposit_amount,
        uint256 _token_supply
    ) internal view returns (uint256 collateral_required) {
        // TODO figure out the exact math formula
        // to calculate the amount of token can be purchased with the current deposit

        // bool _continue = false;
        // uint256 _b = 1;
        // uint256 _m = 5;
        // uint256 _deposit_remaining = _deposit_amount;
        // uint256 _bought_tokens = 0;

        // do {
        //     uint256 _cp = _token_supply == 0
        //         ? _b
        //         : _m * _token_supply;

        //     if (_cp <= _deposit_remaining) {
        //         _deposit_remaining -= _cp;
        //         _bought_tokens++;
        //         _token_supply += _bought_tokens;
        //         _continue = true;
        //     } else {
        //         _continue = false;
        //     }
        // } while (_continue);

        // uint256 tokensSold = _token_supply / 1e18; // scale down to calculate

        // collateral_required = initial_price + (tokensSold * price_slope);
        return 1 ether; //MOCK return value
    }

    /**
     * calculate the amount of Reserve ($ETH) to return at sale
     */
    function calculate_sell_price()
        internal
        pure
        returns (
            // uint256 _total_supply,
            // uint256 _reserve_balance,
            // uint32 _reserve_ratio,
            // uint256 _sell_amount
            uint256
        )
    {
        //TODO MOCK FORMULA: UPDATE
        // both the AMM’s Reserve Token balance and the Continuous Token’s supply have decreased
        // require(_sell_amount > 0, "_sell_amount > 0");
        return 0;
    }
}
