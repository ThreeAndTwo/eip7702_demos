import { parseEther } from "viem";
import { encodeFunctionData } from "viem";
import { createWalletClient, http } from "viem";
import { sepolia, holesky } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { eip7702Actions } from "viem/experimental";

import * as config from './config';


/**
 * 尽管名义上可以授权多个合约地址，但是大多数情况下只会授权给一个批量的合约。
 * 
 * 错误的做法：直接授权给目标合约，然后调用批处理函数，则会提示执行失败。
 * ❌ Error: 
 *  Transaction failed: Error: The transaction has been reverted by the EVM:
 */


async function main() {
    // 0. init account and client
    const account = privateKeyToAccount(config.PRIVATE_KEY);
    const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: http(config.SEPOLIA_RPC),
    }).extend(eip7702Actions());

    // 1. Authorize injection of the Contract's bytecode into our Account.
    const authorization_weth = await walletClient.signAuthorization({
        account,
        chainId: sepolia.id,
        contractAddress:  config.SEPOLIA_WETH,
    });

    const authorization_registry = await walletClient.signAuthorization({
        account,
        chainId: sepolia.id,
        contractAddress:  config.SEPOLIA_SYMBIOTIC_OPERATOR_REGISTRY,
    });
    const authorization_opt_in = await walletClient.signAuthorization({
        account,
        chainId: sepolia.id,
        contractAddress:  config.SEPOLIA_SYMBIOTIC_OPT_IN_SERVICE,
    })

    // 2. Invoke the Contract's `execute` function to perform batch calls.
    const hash = await walletClient.sendTransaction({
        authorizationList: [authorization_weth, authorization_registry, authorization_opt_in],
        data: encodeFunctionData({
            abi: config.SEPOLIA_BATCH_ETH_DELEGATION_ABI,
            functionName: "execute",
            args: [
                [
                    {
                        data: "0xd0e30db0", // deposit ETH to WETH
                        to: config.SEPOLIA_WETH,
                        value: parseEther("0.0001"),
                    },
                    {
                        data: "0x2acde098", // register operator to symbiotic
                        to: config.SEPOLIA_SYMBIOTIC_OPERATOR_REGISTRY,
                        value: parseEther("0"),
                    },
                    {  
                        data: "0xb1138ad1000000000000000000000000bfa7d94ad2f107abc0eb929fd3a8e55928c48c2a", // opt-in
                        to: config.SEPOLIA_SYMBIOTIC_OPT_IN_SERVICE,
                        value: parseEther("0"),
                    },
                ],
            ],
        }),
        to: config.SEPOLIA_BATCH_ETH_DELEGATION_CA, // 尝试直接调用批处理的合约
    });
    try {
        console.log("✅ Transaction successful: ", sepolia.blockExplorers.default.url + "/tx/" + hash);
      } catch (error) {
        console.error("❌ Transaction failed:", error);
      }
}

main();

// 调用错误