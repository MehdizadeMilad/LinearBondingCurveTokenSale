// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;
import "hardhat/console.sol";

contract LinearBundingCurve {
    /** ------------------------------------ State variables ------------------------------------ */

    uint256 public INITIAL_PRICE = 1 ether; // The initial price of tokens in ETH (e.g., 0.001 ETH)
    uint256 public constant INITIAL_SUPPLY = 0; // The initial supply of tokens set to 0.
    uint256 public constant PRICE_SLOPE = 1 ether; // The price increase per token sold - fixed at 1 ether.

    /** ------------------------------------ Constructor ------------------------------------ */
    constructor() {}

    /** ------------------------------------ Internal functions ------------------------------------ */

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

    /**
     * Calculate how much does it cost in ETH to buy a certain amount of token
     *  the formula to calculate it: Linear bunding curve  y = x
     *      ((new_token_amount_to_buy / 2) * (2 * _current_token_supply + new_token_amount_to_buy + 1))
     * @param _current_token_suuply_in_wei totalSupply of the token
     * @param _new_token_amount_to_buy the amount of new token to mint
     *
     * @return _final_cost the require amount of ETH to buy {_new_token_amount_to_buy} right now!
     */
    function token_to_ETH(
        uint256 _current_token_suuply_in_wei,
        uint256 _new_token_amount_to_buy
    ) internal pure returns (uint256 _final_cost) {
        uint256 _PIP = 1000; // 3 fixed-points after the decimal
        uint256 _SCALE = 1e18;

        uint256 _token_supply_in_ether = _current_token_suuply_in_wei / _SCALE;

        uint256 _a = ((_new_token_amount_to_buy * _PIP) / 2);
        uint256 _b = (2 * _token_supply_in_ether);
        uint256 _c = (_new_token_amount_to_buy + 1);

        _final_cost = ((_a * (_b + _c)) / _PIP) * _SCALE;
    }

    /**
     * Calculate how many token with the {_deposited_eth_amount} can be bought in current Curve status
     * @param _current_supply_in_wei the current token totalSupply() in WEI
     * @param _deposited_eth_amount the amount of deposited ETH
     *
     * @notice this implementation is not scalable and can only be used to buy at most 14k token.
     *
     * @return _token_count the amount of token that can be bought with the {_deposited_eth_amount} ETH
     */
    function how_many_token_eth_can_buy(
        uint256 _current_supply_in_wei,
        uint256 _deposited_eth_amount
    ) internal pure returns (uint256 _token_count) {
        //! V1: Replace with an advanced math formula to make it scalable
        for (uint i = 0; ; i++) {
            uint256 _cost = token_to_ETH(_current_supply_in_wei, i);
            if (_cost >= _deposited_eth_amount) {
                return i;
            }
        }
    }
}
