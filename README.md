## ERC1363 Token Sale with a Linear Bonding Curve - MVP

This project demonstrates a simple Linear Token (ERC1363) Sale using Linear Bunding Curve to provide liquidity for the project without the need of DEX or CEX.

## STATUS

MVP:

    [in progress]
        [+] Buy:        ETH ->  ERC20/1363 token
        [] Sell:       ERC20/1363 token -> ETH

TODO for V1:

    [x] make the smart contract upgradeable
    [x] use Slither to detect known vulnerabilities
    [x] support Fixed point decimals
            [x] to allow buying a fractions of a token
            [x] https://github.com/PaulRBerg/prb-math

    [x] make the BUY scalable - currently limited to 14k token at most

```
npm run test
npm run coverage
```
