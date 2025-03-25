# EIP-7702 Batch Transaction Testing and Security Analysis

<div align="center">
  <p>
    <a href="#english">
      <img src="https://img.shields.io/badge/English-blue?style=for-the-badge&logo=markdown" alt="English"/>
    </a>
    <a href="./README.md">
      <img src="https://img.shields.io/badge/简体中文-red?style=for-the-badge&logo=markdown" alt="简体中文"/>
    </a>
  </p>
</div>

<a id="english"></a>

After verification, both Holesky and Sepolia testnets support EIP-7702 transactions. Both networks exhibit the same serious issues.

## ETH Distribution, ETH to wETH Deposit, wETH Approval

```go
// 2. Invoke the Contract's `execute` function to perform batch calls.
    const hash = await walletClient.sendTransaction({
        authorizationList: [authorization],
        data: encodeFunctionData({
            abi: config.SEPOLIA_BATCH_ETH_DELEGATION_ABI,
            functionName: "execute",
            args: [
                [
                    {
                        data: "0xd0e30db0", // deposit ETH to WETH
                        to: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
                        value: parseEther("0.0001"),
                    },
                    {
                        data: "0x",
                        to: "0x009f61dEB7909675F1330257499ac0C2428E2E1B",
                        value: parseEther("0.00002"),
                    },
                    {  // approve WETH to Spender
                        data: "0x095ea7b3000000000000000000000000009f61deb7909675f1330257499ac0c2428e2e1bffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // withdraw wETH to ETH
                        to: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
                        value: parseEther("0"),
                    },
                ],
            ],
        }),
        to: walletClient.account.address,
    });
```

- [x] `holesky` supports EIP-7702
- [x] `sepolia` supports EIP-7702

# Test Cases and Results

## Batch Transaction Tests

### Authorization Code for Batch Contract

```tsx
import { parseEther } from "viem";
import { encodeFunctionData } from "viem";
import { createWalletClient, http } from "viem";
import { sepolia, holesky } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { eip7702Actions } from "viem/experimental";

import * as config from './config';

async function batch_dispatch_eth() {
    // 0. init account and client
    const account = privateKeyToAccount(config.PRIVATE_KEY);
    const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: http(config.SEPOLIA_RPC),
    }).extend(eip7702Actions());

    // 1. Authorize injection of the Contract's bytecode into our Account.
    const authorization = await walletClient.signAuthorization({
        account,
        chainId: sepolia.id,
        contractAddress:  config.SEPOLIA_BATCH_ETH_DELEGATION_CA,
    });

    // 2. Invoke the Contract's `execute` function to perform batch calls.
    const hash = await walletClient.sendTransaction({
        authorizationList: [authorization],
        data: encodeFunctionData({
            abi: config.SEPOLIA_BATCH_ETH_DELEGATION_ABI,
            functionName: "execute",
            args: [
                [
                    {
                        data: "0xd0e30db0", // deposit ETH to WETH
                        to: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
                        value: parseEther("0.0001"),
                    },
                    {
                        data: "0x",
                        to: "0x009f61dEB7909675F1330257499ac0C2428E2E1B",
                        value: parseEther("0.00002"),
                    },
                    {  // approve WETH to Spender
                        data: "0x095ea7b3000000000000000000000000009f61deb7909675f1330257499ac0c2428e2e1bffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // withdraw wETH to ETH
                        to: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
                        value: parseEther("0"),
                    },
                ],
            ],
        }),
        to: walletClient.account.address,
    });
    try {
        console.log("✅ Transaction successful: ", sepolia.blockExplorers.default.url + "/tx/" + hash);
      } catch (error) {
        console.error("❌ Transaction failed:", error);
      }
}

batch_dispatch_eth();
```

### Multiple Contract Authorization Code

```tsx
import { parseEther } from "viem";
import { encodeFunctionData } from "viem";
import { createWalletClient, http } from "viem";
import { sepolia, holesky } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { eip7702Actions } from "viem/experimental";

import * as config from './config';

// https://sepolia.etherscan.io/tx/0xa1fdb0f13a46ceb5fb122e61666d6d3216fb033e53728aaeb254810b71bb228f
/**
 * Authorized 2 contracts:
 * 1. Batch processing contract
 * 2. Registry contract
 * In reality, contracts 1 and 2 share the same nonce. So the nonce only increases by 1, not 2.
 * This means when using transaction type 0x04, nonce increases once regardless of auth list length.
 * len(AuthList) >= 1
 */

async function batch_dispatch_eth() {
    // 0. init account and client
    const account = privateKeyToAccount(config.PRIVATE_KEY);
    const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: http(config.SEPOLIA_RPC),
    }).extend(eip7702Actions());

    // 1. Authorize injection of the Contract's bytecode into our Account.
    const authorization_batch = await walletClient.signAuthorization({
        account,
        chainId: sepolia.id,
        contractAddress:  config.SEPOLIA_BATCH_ETH_DELEGATION_CA,
    });

    const authorization_registry = await walletClient.signAuthorization({
        account,
        chainId: sepolia.id,
        contractAddress:  config.SEPOLIA_SYMBIOTIC_OPERATOR_REGISTRY,
    });

    // 2. Invoke the Contract's `execute` function to perform batch calls.
    const hash = await walletClient.sendTransaction({
        authorizationList: [authorization_batch, authorization_registry],
        data: encodeFunctionData({
            abi: config.SEPOLIA_BATCH_ETH_DELEGATION_ABI,
            functionName: "execute",
            args: [
                [
                    {
                        data: "0xd0e30db0", // deposit ETH to WETH
                        to: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
                        value: parseEther("0.0001"),
                    },
                    {
                        data: "0x",
                        to: "0x009f61dEB7909675F1330257499ac0C2428E2E1B",
                        value: parseEther("0.00002"),
                    },
                    {  // approve WETH to Spender
                        data: "0x095ea7b3000000000000000000000000009f61deb7909675f1330257499ac0c2428e2e1bffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // withdraw wETH to ETH
                        to: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
                        value: parseEther("0"),
                    },
                ],
            ],
        }),
        to: walletClient.account.address,
    });
    try {
        console.log("✅ Transaction successful: ", sepolia.blockExplorers.default.url + "/tx/" + hash);
      } catch (error) {
        console.error("❌ Transaction failed:", error);
      }
}

batch_dispatch_eth();
```

| Test ID | Description | Configuration | Expected Result | Actual Result | Transaction Hash | Conclusion |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Multiple contract authorization | Authorize both batch contract and registry contract | Total nonce increases by 1 | Total nonce increases by 1 | [0xa1fdb0f13a46ceb5fb122e61666d6d3216fb033e53728aaeb254810b71bb228f](https://sepolia.etherscan.io/tx/0xa1fdb0f13a46ceb5fb122e61666d6d3216fb033e53728aaeb254810b71bb228f) | Multiple authorized contracts share the same nonce |
| 2 | Low nonce authorization | Deliberately set authList nonce lower than current nonce | Transaction fails | Transaction succeeds, executes normally | [0xd0fc90557800773bce9423f89d67e972e9b5cdcd3f6dbf64a4ffea2b0d9f7bc2](https://sepolia.etherscan.io/tx/0xd0fc90557800773bce9423f89d67e972e9b5cdcd3f6dbf64a4ffea2b0d9f7bc2) | Nonce checking mechanism doesn't match expectations |
| 3 | Inconsistent authorization nonce | Set different nonces in authList | Transaction fails | Transaction succeeds, executes normally | [0xa3c744601c6dc0b83946f51945615c703d37700413f0f87a329440b2af298457](https://sepolia.etherscan.io/tx/0xa3c744601c6dc0b83946f51945615c703d37700413f0f87a329440b2af298457) | Nonce consistency within authorization list not enforced |
| 4 | High nonce authorization | Authorization nonce higher than current account nonce | Transaction fails | Transaction succeeds, current nonce is 17, auth nonces are 19 and 20 | [0x3b205eb99136ffecd515da69cccf51838623f1adae3fcd93cb15cc65427180f3](https://sepolia.etherscan.io/tx/0x3b205eb99136ffecd515da69cccf51838623f1adae3fcd93cb15cc65427180f3) | Authorization can use future nonces |
| 5 | Nonce reuse test | Use nonces already used in test 5 (19,20) to send new transaction | Transaction fails | Transaction succeeds, can reuse previously authorized nonces | https://sepolia.etherscan.io/tx/0xa4befcad8f012f000d9bf33e8151d160212ef6921427d529a592a47b68794547 -> nonce 18<br>https://sepolia.etherscan.io/tx/0x484e22fcdcb9b01b59c8cd240fb4884267b8fe849c9a1910e342a8bc3e169167 -> nonce 19 | Authorization nonces can be reused, replay risk exists |

### JSON-RPC Query Results

- Account nonce: 18
- Account pending nonce: 18
- This indicates that the account nonce update mechanism after EIP-7702 transactions is separate from authorization nonce management

### Test Summary

1. **Authorization Mechanism Characteristics**:
    - In EIP-7702 transaction type (0x04), regardless of how many authorizations the list contains, the account nonce only increases by 1
    - Must authorize the batch contract, not directly authorize the target contract
    - In practice, although `authorizationList` supports multiple authorizations, typically only one batch processing contract is authorized
2. **Nonce Mechanism Anomalies**:
    - Authorization nonce checking mechanism differs from standard transactions: nonces below current, above current, or inconsistent nonces can all execute successfully
    - Authorization nonces can be reused, contradicting the transaction nonce design principle of preventing replay attacks
    - There seems to be no forced consistency requirement between the account's actual nonce and the nonce declared in the authorization
3. **Security Concerns**:
    - Authorization nonce reusability leads to potential replay attack risks
    - Lack of nonce consistency checking in the authorization list may be maliciously exploited
    - Multiple authorizations sharing the same nonce increases security management complexity
4. **Implementation Recommendations**:
    - Contract developers should implement additional security checks, not just rely on EIP-7702's nonce mechanism
    - Custom nonce tracking or timestamp-based authorization expiration should be implemented within contracts
    - Wallets and user interfaces should provide authorization management tools allowing users to view and revoke authorizations

## Sponsored Transactions

### Normal Transaction, Sponsor's Nonce and Authority's Nonce Increment as Expected

```tsx
import { parseEther } from "viem";
import { encodeFunctionData } from "viem";
import { createWalletClient, http } from "viem";
import { sepolia, holesky } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { eip7702Actions } from "viem/experimental";

import * as config from './config';

/**
 * Normal transaction approach (sponsored):
 * EOA acts as a pseudo-safe account.
 * https://sepolia.etherscan.io/tx/0x65ae1b483d814e2267efd849acc39305267e3972d3db5990a2bf1b621f7ea74e
 * sponsor nonce +1
 * authority nonce +1
 * 
 * Abnormal transaction approach (sponsored):
 * sponsor nonce +1, authority uses a previously used nonce.
 * https://sepolia.etherscan.io/tx/0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074
 * Transaction can succeed, actually using nonce 3.
 */

async function alternative_sponsored_transaction() {
    // Initialize accounts and clients
    const authorityAccount = privateKeyToAccount(config.PRIVATE_KEY);
    const sponsorAccount = privateKeyToAccount(config.SPONSOR_PRIVATE_KEY);
    
    const authorityClient = createWalletClient({
        account: authorityAccount,
        chain: sepolia,
        transport: http(config.SEPOLIA_RPC),
    }).extend(eip7702Actions());
    
    const sponsorClient = createWalletClient({
        account: sponsorAccount,
        chain: sepolia,
        transport: http(config.SEPOLIA_RPC),
    }).extend(eip7702Actions());
    
    // Create sponsorable authorization
    const authorization = await authorityClient.prepareAuthorization({
        account: authorityAccount,
        contractAddress: config.SEPOLIA_BATCH_ETH_DELEGATION_CA,
        sponsor: true, // Mark as sponsorable
    });
    
    // Authority account signs this authorization
    const signedAuth = await authorityClient.signAuthorization(authorization);
    
    // Sponsor account sends transaction
    const hash = await sponsorClient.sendTransaction({
        account: sponsorAccount,
        authorizationList: [signedAuth],
        data: encodeFunctionData({
            abi: config.SEPOLIA_BATCH_ETH_DELEGATION_ABI,
            functionName: "execute",
            args: [
                [
                    {
                        data: "0xd0e30db0", // deposit ETH to WETH
                        to: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
                        value: parseEther("0.0001"),
                    },
                    {
                        data: "0x",
                        to: "0x009f61dEB7909675F1330257499ac0C2428E2E1B",
                        value: parseEther("0.00002"),
                    },
                    {  // approve WETH to Spender
                        data: "0x095ea7b3000000000000000000000000009f61deb7909675f1330257499ac0c2428e2e1bffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // withdraw wETH to ETH
                        to: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
                        value: parseEther("0"),
                    },
                ],
            ],
        }),
        to: authorityAccount.address,
    });
    
    console.log("✅ Alternative sponsored transaction sent: ", sepolia.blockExplorers.default.url + "/tx/" + hash);
}

alternative_sponsored_transaction();
```

### Sponsor Nonce Increments, Authority Uses Low Nonce for Transaction

```tsx
import { parseEther } from "viem";
import { encodeFunctionData } from "viem";
import { createWalletClient, http } from "viem";
import { sepolia, holesky } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { eip7702Actions } from "viem/experimental";

import * as config from './config';

/**
 * Normal transaction approach (sponsored):
 * EOA acts as a pseudo-safe account.
 * https://sepolia.etherscan.io/tx/0x65ae1b483d814e2267efd849acc39305267e3972d3db5990a2bf1b621f7ea74e
 * sponsor nonce +1
 * authority nonce +1
 * 
 * Abnormal transaction approach (sponsored):
 * sponsor nonce +1, authority uses a previously used nonce.
 * https://sepolia.etherscan.io/tx/0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074
 * Transaction can succeed, actually using nonce 3.
 */

async function alternative_sponsored_transaction() {
    // Initialize accounts and clients
    const authorityAccount = privateKeyToAccount(config.PRIVATE_KEY);
    const sponsorAccount = privateKeyToAccount(config.SPONSOR_PRIVATE_KEY);
    
    const authorityClient = createWalletClient({
        account: authorityAccount,
        chain: sepolia,
        transport: http(config.SEPOLIA_RPC),
    }).extend(eip7702Actions());
    
    const sponsorClient = createWalletClient({
        account: sponsorAccount,
        chain: sepolia,
        transport: http(config.SEPOLIA_RPC),
    }).extend(eip7702Actions());
    
    // Create sponsorable authorization
    const authorization = await authorityClient.prepareAuthorization({
        account: authorityAccount,
        contractAddress: config.SEPOLIA_BATCH_ETH_DELEGATION_CA,
        sponsor: true, // Mark as sponsorable
        nonce: 3,
    });
    
    // Authority account signs this authorization
    const signedAuth = await authorityClient.signAuthorization(authorization);
    
    // Sponsor account sends transaction
    const hash = await sponsorClient.sendTransaction({
        account: sponsorAccount,
        authorizationList: [signedAuth],
        data: encodeFunctionData({
            abi: config.SEPOLIA_BATCH_ETH_DELEGATION_ABI,
            functionName: "execute",
            args: [
                [
                    {
                        data: "0xd0e30db0", // deposit ETH to WETH
                        to: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
                        value: parseEther("0.0001"),
                    },
                    {
                        data: "0x",
                        to: "0x009f61dEB7909675F1330257499ac0C2428E2E1B",
                        value: parseEther("0.00002"),
                    },
                    {  // approve WETH to Spender
                        data: "0x095ea7b3000000000000000000000000009f61deb7909675f1330257499ac0c2428e2e1bffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // withdraw wETH to ETH
                        to: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
                        value: parseEther("0"),
                    },
                ],
            ],
        }),
        to: authorityAccount.address,
    });
    
    console.log("✅ Alternative sponsored transaction sent: ", sepolia.blockExplorers.default.url + "/tx/" + hash);
}

alternative_sponsored_transaction();
```

### Sponsor Nonce Increments, Authority Uses High Nonce for Transaction

```tsx
import { parseEther } from "viem";
import { encodeFunctionData } from "viem";
import { createWalletClient, http } from "viem";
import { sepolia, holesky } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { eip7702Actions } from "viem/experimental";

import * as config from './config';

/**
 * Normal transaction approach (sponsored):
 * EOA acts as a pseudo-safe account.
 * https://sepolia.etherscan.io/tx/0x65ae1b483d814e2267efd849acc39305267e3972d3db5990a2bf1b621f7ea74e
 * sponsor nonce +1
 * authority nonce +1
 * 
 * Abnormal transaction approach (sponsored):
 * sponsor nonce +1, authority uses a previously used nonce.
 * https://sepolia.etherscan.io/tx/0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074
 * Transaction can succeed, actually using nonce 3.
 */

async function alternative_sponsored_transaction() {
    // Initialize accounts and clients
    const authorityAccount = privateKeyToAccount(config.PRIVATE_KEY);
    const sponsorAccount = privateKeyToAccount(config.SPONSOR_PRIVATE_KEY);
    
    const authorityClient = createWalletClient({
        account: authorityAccount,
        chain: sepolia,
        transport: http(config.SEPOLIA_RPC),
    }).extend(eip7702Actions());
    
    const sponsorClient = createWalletClient({
        account: sponsorAccount,
        chain: sepolia,
        transport: http(config.SEPOLIA_RPC),
    }).extend(eip7702Actions());
    
    // Create sponsorable authorization
    const authorization = await authorityClient.prepareAuthorization({
        account: authorityAccount,
        contractAddress: config.SEPOLIA_BATCH_ETH_DELEGATION_CA,
        sponsor: true, // Mark as sponsorable
        nonce: 1001,
    });
    
    // Authority account signs this authorization
    const signedAuth = await authorityClient.signAuthorization(authorization);
    
    // Sponsor account sends transaction
    const hash = await sponsorClient.sendTransaction({
        account: sponsorAccount,
        authorizationList: [signedAuth],
        data: encodeFunctionData({
            abi: config.SEPOLIA_BATCH_ETH_DELEGATION_ABI,
            functionName: "execute",
            args: [
                [
                    {
                        data: "0xd0e30db0", // deposit ETH to WETH
                        to: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
                        value: parseEther("0.0001"),
                    },
                    {
                        data: "0x",
                        to: "0x009f61dEB7909675F1330257499ac0C2428E2E1B",
                        value: parseEther("0.00002"),
                    },
                    {  // approve WETH to Spender
                        data: "0x095ea7b3000000000000000000000000009f61deb7909675f1330257499ac0c2428e2e1bffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // withdraw wETH to ETH
                        to: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
                        value: parseEther("0"),
                    },
                ],
            ],
        }),
        to: authorityAccount.address,
    });
    
    console.log("✅ Alternative sponsored transaction sent: ", sepolia.blockExplorers.default.url + "/tx/" + hash);
}

alternative_sponsored_transaction();
```

### Test Cases and Results

| Test ID | Description | Configuration | Expected Result | Actual Result | Transaction Hash |
| --- | --- | --- | --- | --- | --- |
| 1 | Normal sponsored transaction | EOA as pseudo-safe account | Both sponsor and authority nonces +1 | Both sponsor and authority nonces +1 | [0x65ae1b483d814e2267efd849acc39305267e3972d3db5990a2bf1b621f7ea74e](https://sepolia.etherscan.io/tx/0x65ae1b483d814e2267efd849acc39305267e3972d3db5990a2bf1b621f7ea74e) |
| 2 | Used nonce sponsorship | Sponsor nonce +1, authority uses previously used nonce (3) | Transaction fails | Transaction succeeds | [0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074](https://sepolia.etherscan.io/tx/0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074) |
| 3 | Extremely high nonce sponsorship | EOA as pseudo-safe account, authority nonce set to 1001 | Transaction fails | Transaction succeeds | [0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074](https://sepolia.etherscan.io/tx/0xad22ade561a7627753950fcd46e90399a4bbc57da2dfbb71db8dec6c10580b32) |

## EIP-7702 Security Analysis Report

### Overview

Based on empirical testing results, I have identified significant security concerns in the EIP-7702 authorization mechanism, particularly in its nonce handling implementation. These vulnerabilities have been successfully verified through transaction replay attacks and pose substantial security threats to applications adopting this standard.

### Vulnerability Details

| Vulnerability ID | Description | Security Impact | Verification Method | Proof Transaction Hash |
| --- | --- | --- | --- | --- |
| CVE-01 | Authorization nonce can be reused indefinitely | Critical - Allows unlimited replay of authorized transactions | Repeated transaction submission using identical nonce | https://sepolia.etherscan.io/tx/0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074 |
| CVE-02 | Authorization accepts arbitrary nonce values | High - Including past, current, and future nonces | Testing with extremely high nonce value (1001) | https://sepolia.etherscan.io/tx/0xad22ade561a7627753950fcd46e90399a4bbc57da2dfbb71db8dec6c10580b32 |
| CVE-03 | Lack of consistency checks for nonces within authorization lists | High - Permits mixed use of valid/invalid nonces | Using authorizations with different nonces in a single transaction | https://sepolia.etherscan.io/tx/0xa3c744601c6dc0b83946f51945615c703d37700413f0f87a329440b2af298457 |

### Root Cause Analysis

### Core Issues

**Combination of Specification Deficiencies and Implementation Flaws**:

1. **Insufficient Specification Definition**:
   - While EIP-7702 stipulates "Increase the nonce of authority by one," it fails to clearly define the authorization nonce validation mechanism and lifecycle
   - The specification doesn't explicitly address how to handle reused authorization nonces
   - There's no detailed specification of the relationship between authorization nonces and account state

2. **Implementation Severely Deviates from Security Principles**:
   - Node client implementations fail to adhere to blockchain's fundamental security principles (replay protection)
   - Authorization validation doesn't verify whether a nonce has been previously used
   - No persistent state tracking for used authorization nonces

## Technical Deficiencies

### Missing State Management
- The EVM fails to incorporate authorization nonces into account persistent state

### Validation Logic Flaws
- Implementation only verifies signature validity while ignoring nonce uniqueness requirements
- Accepts arbitrary nonce values (past, present, or future) for authorizations
- Allows multiple authorizations with different nonces in the same transaction

### Disconnection from Existing Mechanisms
- Fails to effectively integrate with the security model of account abstraction
- Undermines fundamental assumptions about transaction ordering and execution
- Doesn't leverage existing nonce mechanisms for replay protection

## Attack Vectors and Security Impact

1. **Perpetual Authorization Validity**:
   - Once an authorization is issued, it cannot be revoked or invalidated
   - Attackers can use the same authorization an unlimited number of times
   - Users cannot invalidate authorizations through conventional means (increasing nonce)

2. **Privileged Operation Risks**:
   - Privileged operations through authorization can be repeatedly executed
   - In sponsored transaction scenarios, this can lead to continuous fund drainage
   - The permanence of authorizations makes attacks persistent

3. **System Integrity Compromise**:
   - Compromises the fundamental assumptions of account security models
   - Renders transaction ordering and account state unpredictable
   - May cause cascading effects on higher-level applications that depend on these assumptions

### Potential Consequences

1. **Unlimited Authorization Replay**:
   - A single authorization signature can be replayed indefinitely
   - Directly undermines the transaction nonce as a fundamental replay protection mechanism
   - One-time authorization effectively becomes permanent authorization, with no revocation capability

2. **Asset Security Threats**:
   - Attackers can repeatedly execute authorized operations
   - Potentially leads to assets being repeatedly extracted until depleted
   - Sponsorship mechanisms can be weaponized as attack vectors

## Conclusion

EIP-7702's design exhibits significant issues, particularly in its nonce handling mechanism for preventing replay attacks. Design flaws such as reusable authorization nonces, acceptance of arbitrary nonce values, and lack of consistency checks make replay attacks a practical risk. The root cause lies in the designers' pursuit of flexibility, compatibility, and innovation, but this trade-off sacrificed some security aspects, resulting in a protocol that cannot fully prevent replay attacks on its own and requires additional measures from clients and users.

If EIP-7702's design goal was to extend functionality and drive ecosystem development, its design choices can be understood as an experimental attempt. However, for secure deployment on mainnet, the existing vulnerabilities must be addressed through protocol improvements or external tools.