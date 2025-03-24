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
* https://holesky.etherscan.io/tx/0x363289d2e958ad382a3050db4100741ce8f7cbc8507a0e19a9b67ab55647694e
* sponsor nonce +1
* authority nonce +1
* 
* Abnormal transaction approach (sponsored):
* sponsor nonce +1, authority uses a previously used nonce.
* https://holesky.etherscan.io/tx/0x6c8c96bd1327ef51827bdccf828ada8d58fee376efcb1e49a27e891084289804
* Transaction succeeds, actually using nonce 0.
* 
* 
* Abnormal transaction approach (sponsored):
* EOA acts as a pseudo-safe account.
*
* URL_ADDRESSpolia.etherscan.io/tx/0x65ae1b483d814e2267efd849acc39305267e3972d3db5990a2bf1b621f7ea74e
* sponsor nonce +1
* authority set to an extremely high nonce = 1001
* https://holesky.etherscan.io/tx/0x7063588f0b6c2d687a10b9bfa8e57f8d2e584cc5c70a4f00018d0710029d8e16
* Transaction succeeds
*/

async function alternative_sponsored_transaction() {
    // 初始化账户和客户端
    const authorityAccount = privateKeyToAccount(config.PRIVATE_KEY);
    const sponsorAccount = privateKeyToAccount(config.SPONSOR_PRIVATE_KEY);
    
    const authorityClient = createWalletClient({
        account: authorityAccount,
        chain: holesky,
        transport: http(config.HOLESKY_RPC),
    }).extend(eip7702Actions());
    
    const sponsorClient = createWalletClient({
        account: sponsorAccount,
        chain: holesky,
        transport: http(config.HOLESKY_RPC),
    }).extend(eip7702Actions());
    
    // 创建可赞助的授权
    const authorization = await authorityClient.prepareAuthorization({
        account: authorityAccount,
        contractAddress: config.HOLESKY_BATCH_ETH_DELEGATION_CA,
        sponsor: true, // 标记为可赞助
        nonce: 1001, // 测试正常 nonce
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
                        to: config.HOLESKY_WETH,
                        value: parseEther("0.001"),
                    }
                ],
            ],
        }),
        to: authorityAccount.address,
    });
    
    console.log("✅ Alternative sponsored transaction sent: ", holesky.blockExplorers.default.url + "/tx/" + hash);
}

alternative_sponsored_transaction();
