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

