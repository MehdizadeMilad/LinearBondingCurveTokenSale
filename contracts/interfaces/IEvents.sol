// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

interface IEvents {
    event Minted(
        address indexed _to, // participant address
        uint256 _reserve_deposit_amount, // how much ETH (Reserve currency) is deposited
        uint256 _token_amount, // how much project token is minted
        uint256 _total_reserve,
        uint256 _total_token_supply
    );
    event Burned(
        uint256 _token_amount, // how much token is going to be burnt
        uint256 _reserve_amount // how much ETH will be transferred back
    );
}
