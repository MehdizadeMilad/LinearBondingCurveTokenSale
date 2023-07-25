// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

interface IEvents {
    event Minted(
        address indexed _to, // participant address
        uint256 reserveDepositAmount, // how much ETH (Reserve currency) is deposited
        uint256 tokenAmount, // how much project token is minted
        uint256 totalReserve,
        uint256 totalTokenSupply
    );
    event Burned(
        uint256 tokenAmount, // how much token is going to be burnt
        uint256 reserveAmount // how much ETH will be transferred back
    );
}
