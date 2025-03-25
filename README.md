# EIP-7702 批量交易测试与安全分析

<div align="center">
  <p>
    <a href="./README_EN.md">
      <img src="https://img.shields.io/badge/English-blue?style=for-the-badge&logo=markdown" alt="English"/>
    </a>
    <a href="#chinese">
      <img src="https://img.shields.io/badge/简体中文-red?style=for-the-badge&logo=markdown" alt="简体中文"/>
    </a>
  </p>
</div>

<a id="chinese"></a>

## 概述

经过验证，Holesky 和 Sepolia 测试网络都支持 EIP-7702 交易类型。两个网络都存在相同的严重安全问题。

## 分发 ETH, deposit ETH to wETH, approve wETH

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

- [x]  `holesky` 支持 7702
- [x]  `sepolia` 支持 7702

# 测试 case 以及结果

## 批量发交易

### 给授权批处理合约的代码

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

### 授权给多个合约的代码

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
 * 授权了 2个合约
 * 1. 批处理合约
 * 2. 注册合约
 * 实际上 1，2 合约的 nonce 是同一个。所以，nonce 只能增加 1， 不能增加 2。 -> Increase the nonce of authority by one.
 * 也就是使用 0x04 的交易类型发送交易，nonce 一次性会 +2。
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

| 测试ID | 测试描述 | 测试配置 | 预期结果 | 实际结果 | 交易哈希 | 结论 |
|-------|---------|---------|---------|---------|---------|------|
| 1 | 多合约授权 | 同时授权批处理合约和注册合约 | 总体nonce只增加1 | 总体nonce只增加1 | [0xa1fdb0f](https://sepolia.etherscan.io/tx/0xa1fdb0f13a46ceb5fb122e61666d6d3216fb033e53728aaeb254810b71bb228f) | 多个授权合约共享同一个nonce |
| 2 | 低nonce授权 | authList的nonce故意设置低于当前nonce | 交易失败 | 交易成功，正常执行 | [0xd0fc90](https://sepolia.etherscan.io/tx/0xd0fc90557800773bce9423f89d67e972e9b5cdcd3f6dbf64a4ffea2b0d9f7bc2) | nonce检查机制与预期不符 |
| 3 | 授权nonce不一致 | authList中设置不同的nonce | 交易失败 | 交易成功，正常执行 | [0xa3c744](https://sepolia.etherscan.io/tx/0xa3c744601c6dc0b83946f51945615c703d37700413f0f87a329440b2af298457) | 授权列表内的nonce一致性未被强制检查 |
| 4 | 高nonce授权 | 授权nonce高于当前账户nonce | 交易失败 | 交易成功，当前nonce为17，授权nonce为19和20 | [0x3b205e](https://sepolia.etherscan.io/tx/0x3b205eb99136ffecd515da69cccf51838623f1adae3fcd93cb15cc65427180f3) | 授权可以使用未来nonce |
| 5 | nonce复用测试 | 使用已在测试5中用过的nonce(19,20)发送新交易 | 交易失败 | 交易成功，可重复使用已授权过的nonce | [链接1](https://sepolia.etherscan.io/tx/0xa4befcad8f012f000d9bf33e8151d160212ef6921427d529a592a47b68794547) [链接2](https://sepolia.etherscan.io/tx/0x484e22fcdcb9b01b59c8cd240fb4884267b8fe849c9a1910e342a8bc3e169167) | 授权nonce可重复使用，存在重放风险 |

### JSON-RPC 查询结果

- 账户 nonce: 18
- 账户 pending nonce: 18
- 这表明 EIP-7702 交易后账户 nonce 的更新机制与授权 nonce 管理分离

### 测试总结

1. **授权机制特性**：
    - EIP-7702交易类型(0x04)中，无论授权列表包含多少个授权，账户nonce只增加1
    - 必须授权给批处理合约，而非直接授权给目标合约
    - 实际使用中，虽然`authorizationList`支持多个授权，但通常只授权给一个批量处理合约
2. **Nonce机制异常**：
    - 授权的nonce检查机制与标准交易不同：低于当前nonce、高于当前nonce或不一致的nonce均能成功执行
    - 授权 nonce 可以重复使用，这与交易 nonce 用于防止重放攻击的设计原则相悖
    - 账户实际 nonce 与授权中声明的 nonce 之间似乎没有强制一致性要求
3. **安全隐患**：
    - 授权 nonce 可重复使用导致潜在的重放攻击风险
    - 授权列表中nonce不一致性未被检查，可能被恶意利用
    - 多授权共享同一个nonce增加了安全管理的复杂性
4. **实现建议**：
    - 合约开发者应实现额外的安全检查，不仅依赖EIP-7702的nonce机制
    - 应在合约内部实现自定义的nonce跟踪或使用时间戳来限制授权有效期
    - 钱包和用户界面应提供授权管理工具，允许用户查看和撤销授权

## sponsor 交易

### 正常交易, sponsor 的 nonce 和 authority 的 nonce 按照预期自增

```tsx
import { parseEther } from "viem";
import { encodeFunctionData } from "viem";
import { createWalletClient, http } from "viem";
import { sepolia, holesky } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { eip7702Actions } from "viem/experimental";

import * as config from './config';

/**
 * 正常发交易的思路（代付）：
 * EOA 作为伪 safe 账户。
 * https://sepolia.etherscan.io/tx/0x65ae1b483d814e2267efd849acc39305267e3972d3db5990a2bf1b621f7ea74e
 * sponsor nonce +1
 * authority nonce +1
 * 
 * 非正常发交易的思路（代付）：
 * sponsor nonce +1, authority 使用已经使用过的 nonce。 
 * https://sepolia.etherscan.io/tx/0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074
 * 交易可以成功，实际上使用的 nonce 是 3。
 */

async function alternative_sponsored_transaction() {
    // 初始化账户和客户端
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
    
    // 创建可赞助的授权
    const authorization = await authorityClient.prepareAuthorization({
        account: authorityAccount,
        contractAddress: config.SEPOLIA_BATCH_ETH_DELEGATION_CA,
        sponsor: true, // 标记为可赞助
    });
    
    // 授权账户签名这个授权
    const signedAuth = await authorityClient.signAuthorization(authorization);
    
    // 赞助账户发送交易
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

### sponsor nonce 自增，authority 使用低 nonce 发送交易

```tsx
import { parseEther } from "viem";
import { encodeFunctionData } from "viem";
import { createWalletClient, http } from "viem";
import { sepolia, holesky } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { eip7702Actions } from "viem/experimental";

import * as config from './config';

/**
 * 正常发交易的思路（代付）：
 * EOA 作为伪 safe 账户。
 * https://sepolia.etherscan.io/tx/0x65ae1b483d814e2267efd849acc39305267e3972d3db5990a2bf1b621f7ea74e
 * sponsor nonce +1
 * authority nonce +1
 * 
 * 非正常发交易的思路（代付）：
 * sponsor nonce +1, authority 使用已经使用过的 nonce。 
 * https://sepolia.etherscan.io/tx/0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074
 * 交易可以成功，实际上使用的 nonce 是 3。
 */

async function alternative_sponsored_transaction() {
    // 初始化账户和客户端
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
    
    // 创建可赞助的授权
    const authorization = await authorityClient.prepareAuthorization({
        account: authorityAccount,
        contractAddress: config.SEPOLIA_BATCH_ETH_DELEGATION_CA,
        sponsor: true, // 标记为可赞助
        nonce: 3,
    });
    
    // 授权账户签名这个授权
    const signedAuth = await authorityClient.signAuthorization(authorization);
    
    // 赞助账户发送交易
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

### sponsor nonce 自增，authority 使用高 nonce 发送交易

```tsx
import { parseEther } from "viem";
import { encodeFunctionData } from "viem";
import { createWalletClient, http } from "viem";
import { sepolia, holesky } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { eip7702Actions } from "viem/experimental";

import * as config from './config';

/**
 * 正常发交易的思路（代付）：
 * EOA 作为伪 safe 账户。
 * https://sepolia.etherscan.io/tx/0x65ae1b483d814e2267efd849acc39305267e3972d3db5990a2bf1b621f7ea74e
 * sponsor nonce +1
 * authority nonce +1
 * 
 * 非正常发交易的思路（代付）：
 * sponsor nonce +1, authority 使用已经使用过的 nonce。 
 * https://sepolia.etherscan.io/tx/0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074
 * 交易可以成功，实际上使用的 nonce 是 3。
 */

async function alternative_sponsored_transaction() {
    // 初始化账户和客户端
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
    
    // 创建可赞助的授权
    const authorization = await authorityClient.prepareAuthorization({
        account: authorityAccount,
        contractAddress: config.SEPOLIA_BATCH_ETH_DELEGATION_CA,
        sponsor: true, // 标记为可赞助
        nonce: 1001,
    });
    
    // 授权账户签名这个授权
    const signedAuth = await authorityClient.signAuthorization(authorization);
    
    // 赞助账户发送交易
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

### 测试用例与结果

| 测试 ID | 测试描述 | 测试配置 | 预期结果 | 实际结果 | 交易哈希 |
| --- | --- | --- | --- | --- | --- |
| 1 | 正常代付交易 | EOA作为伪safe账户 | sponsor和authority的nonce都+1 | sponsor和authority的nonce都+1 | [0x65ae1b483d814e2267efd849acc39305267e3972d3db5990a2bf1b621f7ea74e](https://sepolia.etherscan.io/tx/0x65ae1b483d814e2267efd849acc39305267e3972d3db5990a2bf1b621f7ea74e) |
| 2 | 已用nonce代付 | sponsor nonce +1, authority使用已用过的nonce(3) | 交易失败 | 交易成功 | [0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074](https://sepolia.etherscan.io/tx/0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074) |
| 3 | 极高nonce代付 | EOA作为伪safe账户，authority nonce设为1001 | 交易失败 | 交易成功 | [0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074](https://sepolia.etherscan.io/tx/0xad22ade561a7627753950fcd46e90399a4bbc57da2dfbb71db8dec6c10580b32) |

## EIP-7702 安全分析报告

### 概述

基于实际测试结果，我发现 EIP-7702 授权机制存在严重的安全隐患，主要表现在 nonce 处理机制上。这些漏洞已通过交易重放成功验证，对采用该标准的应用构成严重安全威胁。

### 漏洞详情

| 隐患ID | 隐患描述 | 安全影响 | 验证方法 | 证明交易哈希 |
| --- | --- | --- | --- | --- |
| CVE-01 | 授权 nonce 可重复使用 | 严重 - 允许无限次重放授权交易 | 使用相同 nonce 重复发送交易 | https://sepolia.etherscan.io/tx/0xe46f8fd561a1a49c2ce94bf0f38bc72fbf78eb5dac869232bf5cd18d52f8b074 |
| CVE-02 | 授权接受任意 nonce 值 | 高危 - 包括过去、当前和未来的 nonce | 使用极高 nonce 值(1001)测试 | https://sepolia.etherscan.io/tx/0xad22ade561a7627753950fcd46e90399a4bbc57da2dfbb71db8dec6c10580b32 |
| CVE-03 | 授权列表内 nonce 不一致性检查缺失 | 高危 - 允许混合使用有效/无效 nonce | 在一个交易中使用不同 nonce 的授权 | https://sepolia.etherscan.io/tx/0xa3c744601c6dc0b83946f51945615c703d37700413f0f87a329440b2af298457 |

### 根本原因分析

### 核心问题

**规范缺陷与实现错误的结合**：

1. **规范定义不充分**：
    - EIP-7702 虽然规定了"Increase the nonce of authority by one"，但未明确定义授权nonce的验证机制和生命周期
    - 规范未明确说明如何处理重复使用的授权nonce
    - 没有详细规定授权 nonce 与账户状态之间的关系
2. **实现严重偏离安全原则**：
    - 节点客户端实现未遵循区块链基本安全原则（防重放保护）
    - 验证授权时未检查 nonce 是否已被使用
    - 未维护已使用授权 nonce 的状态记录
    - 未维护已使用授权nonce 的状态记录

## 技术层面缺陷
### 状态管理缺失
- EVM未将授权 nonce 纳入账户持久状态

### 验证逻辑错误
- 实现仅验证签名有效性，而忽略了nonce的唯一性要求
- 允许任意 nonce 值（过去、现在或未来）用于授权
- 允许在同一交易中使用不同 nonce 的多个授权

### 与现有机制脱节
- 未能与账户抽象的安全模型有效整合
- 破坏了交易顺序和执行的基本假设
- 未能利用现有的 nonce 机制进行防重放保护

## 攻击载体与安全影响
1. **授权永久有效**：
    - 一旦授权签发，无法被撤销或使其失效
    - 攻击者可无限次使用同一授权
    - 用户无法通过常规手段（增加nonce）使授权失效
2. **特权操作风险**：
    - 可以反复执行授权的特权操作
    - 在代付场景下，导致资金持续外流
    - 授权的永久性使攻击具有持续性
3. **系统完整性破坏**：
    - 破坏了账户安全模型的基本假设
    - 使交易顺序和账户状态变得不可预测
    - 可能对依赖这些假设的上层应用造成连锁反应

### 可能产生的后果

1. **无限授权重放**：
    - 一个授权签名可以被无限次重放
    - 直接破坏交易 nonce 作为防重放机制的基本保证
    - 授权一次等同于永久授权，用户无法撤销
2. **资产安全威胁**：
    - 攻击者可重复执行授权操作
    - 可能导致资产被反复提取直至耗尽
    - 代付机制被滥用为攻击向量

## 总结
EIP-7702的设计确实存在问题，特别是其 nonce 处理机制在防范重放攻击方面存在明显不足。授权nonce 可重用、接受任意 nonce 值以及缺乏一致性检查等设计缺陷，使得重放攻击成为现实风险。这些问题的根源在于设计者对灵活性、兼容性和创新性的追求，但这种权衡牺牲了部分安全性，导致协议本身无法完全防止重放攻击，而需依赖客户端和用户采取额外措施。
如果 EIP-7702 的设计目标是实现功能扩展并推动生态发展，那么其设计选择可以理解为一种实验性尝试。然而，要在主网上安全部署，必须通过协议改进或外部工具解决现有漏洞。