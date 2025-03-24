import { parseEther } from "viem";
import { encodeFunctionData } from "viem";
import { createWalletClient, http } from "viem";
import { sepolia, holesky } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { eip7702Actions } from "viem/experimental";

import * as config from './config';

/**
 * 授权了 2个合约
 * 1. authList 故意 nonce 给低，看交易是否能成功 -> 交易会成功 (https://sepolia.etherscan.io/tx/0xd0fc90557800773bce9423f89d67e972e9b5cdcd3f6dbf64a4ffea2b0d9f7bc2)
 *  并且正常执行了 authorization_batch 的交易 -> 实际指定的 batch nonce 为 1
 * 2. authList 的 nonce 故意设置不一致，看交易是否能成功 -> 交易成功(https://sepolia.etherscan.io/tx/0xa3c744601c6dc0b83946f51945615c703d37700413f0f87a329440b2af298457)
 *  并且正常执行了 authorization_batch 的交易 -> 实际指定的 batch nonce 为 1
 * 3. authList 故意跳个 nonce，看交易能否成功 -> 交易成功(https://sepolia.etherscan.io/tx/0x3b205eb99136ffecd515da69cccf51838623f1adae3fcd93cb15cc65427180f3)
 *  并且正常执行了 authorization_batch 的交易 -> 交易 nonce 为17， 实际指定的 batch nonce 为 19，registry nonce 为 20
 *  -> 应该查看去查看 EOA 地址的 nonce，并且验证 nonce 为 19, 20 的 nonce 还能否再次使用。
 * json-rpc 查看了 nonce 以及 pending nonce, 均为 18
 * 4. 发送了 nonce 为 18 的交易，真正的 nonce 并没有更新，验证 nonce 为 19, 20 的 nonce 还能否再次使用 -> 可以再次使用。    
 * https://sepolia.etherscan.io/tx/0xa4befcad8f012f000d9bf33e8151d160212ef6921427d529a592a47b68794547 -> nonce 18
 * https://sepolia.etherscan.io/tx/0x484e22fcdcb9b01b59c8cd240fb4884267b8fe849c9a1910e342a8bc3e169167 -> nonce 19
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
        nonce: 2,
    });

    const authorization_registry = await walletClient.signAuthorization({
        account,
        chainId: sepolia.id,
        contractAddress:  config.SEPOLIA_SYMBIOTIC_OPERATOR_REGISTRY,
        nonce: 2,
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

