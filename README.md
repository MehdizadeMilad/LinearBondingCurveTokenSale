# ERC1363 Token Sale with a Linear Bonding Curve

This project demonstrates a simple Linear Token (ERC1363) Sale using Linear Bunding Curve to provide liquidity for the project without the need of DEX or CEX.

#### STATUS 
MVP:

    [in progress]

        [+] implement ERC ERC1363
        
        [?] calculate the price - figure out the exact formula
            Input: ETH amount
            Output: Token amount

V1:

    [] make smart contracts upgradeable

    [] use Slither

    [] buying fractions of tokens - prb/math
        [] Fixed point decimals
            [] https://www.npmjs.com/package/@prb/math 
            or https://github.com/PaulRBerg/prb-math



```
npm run test
npm run coverage
```

