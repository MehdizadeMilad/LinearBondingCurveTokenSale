## ERC1363 Token Sale with Linear Bonding Curve - MVP

This project demonstrates the sale of ERC1363 tokens using a linear bonding curve (y=x). The bonding curve ensures project liquidity without dependence on DEX or CEX. Each token minted increases the price by 1 ether, while each token burned reduces the price by 1 ether.

**Specifications:**

1. **Token Standard:** the smart contract should implement the `ERC1363` standard. It should also implement `ERC1363Receiver`
2. **Purchase and Minting:** When a user sends ETH to the contract, it should trigger the **`receive`** function, mint the corresponding amount of tokens and transfer them to the buyer. A linear bonding curve should determine the token price.
3. **Selling and Burning:** When a user sends tokens back to the contract, it should trigger the **`onTransferReceived`** function. The contract should burn the tokens and send the corresponding amount of ETH back to the seller. The return ETH amount should be calculated according to the current state of the linear bonding curve.
4. **Testing:** Include unit tests to verify the correctness of your contract. Tests should cover token buying and selling scenarios, ensuring that the token amounts are calculated correctly, and edge cases are properly handled.

## STATUS
#### Completed MVP:

* Token Standard
* Token Purchase/Minting
* Token Selling/Burning
* Testing

#### V1 Enhancements:

* Upgradeable Smart Contract
* Vulnerability Detection using Slither
* Fractional Token Support
    * Enable buying/selling a fraction of a token
        * See [prb-math](https://github.com/PaulRBerg/prb-math)
* Scalable Token Buying Mechanism
    * Overcame the limit of 14k tokens via advanced mathematical root-finding
* Uncovered Test Scenario Addressed
    * Handle case at AMMToken.sol Line:149 by using mocking

### Test & Coverage report

```
npm run test
npm run coverage
```
