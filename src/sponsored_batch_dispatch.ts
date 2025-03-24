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
