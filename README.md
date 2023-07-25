## ERC1363 Token Sale with Linear Bonding Curve - MVP

This project shows a basic example of selling ERC1363 tokens using a straight-line bonding curve (y=x). The bonding curve helps add liquidity to the project without relying on DEX or CEX. The token price goes up by 1 ether when minted and goes down by 1 ether when burned.

**Specifications:**

1. **Token Standard:** Your contract should implement the `ERC1363` standard. It should also implement `ERC1363Receiver`
2. **Purchase and Minting:** When a user sends ETH to the contract, it should trigger the **`receive`** function, mint the corresponding amount of tokens and transfer them to the buyer. A linear bonding curve should determine the token price.
3. **Selling and Burning:** When a user sends tokens back to the contract, it should trigger the **`onTransferReceived`** function. The contract should burn the tokens and send the corresponding amount of ETH back to the seller. The return ETH amount should be calculated according to the current state of the linear bonding curve.
4. **Testing:** Include unit tests to verify the correctness of your contract. Tests should cover token buying and selling scenarios, ensuring that the token amounts are calculated correctly, and edge cases are properly handled.

## STATUS

MVP:

    [+] Token Standard
    [+] Purchase and Minting
    [+] Selling and Burning
    [.] Testing
    [.] Refactor

TODO for V1:

    [x] make the smart contract upgradeable
    [x] use Slither to detect known vulnerabilities
    [x] support Fractions (Fixed point decimals)
        [x] to allow buying a fractions of a token
        [x] https://github.com/PaulRBerg/prb-math

    [x] make the BUY scalable - currently limited to 14k token at most
        it requires an advanced math formula to find the root (sqrt, etc.) to make it scalable

### Notation:

```
[.] In Progress
[+] Done
[x] Closed
```

### Test & Coverage report

```
npm run test
npm run coverage
```
