import { parseEther, hexToBytes } from "viem";
import { encodeFunctionData, encodeDeployData } from "viem";
import { createWalletClient, http, custom } from "viem";
import { holesky, sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { eip7702Actions } from "viem/experimental";

import * as config from './config';

/**
 * 1. 重放 nonce == 1001 的授权交易 https://holesky.etherscan.io/tx/0xdc19f4b352d6e536b11e753ce1054ca6ddabfbc417c563ac792d3880e1e6f042
 * 2. 重放 nonce == 0 的授权交易 https://holesky.etherscan.io/tx/0x79278744a4b6f82a80bcba6b0d951234f145a6c9a2367c57db81a8366a8bc54a
*/

async function alternativeReplay() {
    const sponsorAccount = privateKeyToAccount(config.SPONSOR2_PRIVATE_KEY);
    const walletClient = createWalletClient({
        account: sponsorAccount,
        chain: holesky,
        transport: http(config.HOLESKY_RPC),
    }).extend(eip7702Actions());

    const existingAuthorization = {
        contractAddress: "0x7fbd22c5e75fd65a217513c6e5c8fca59207cca1", 
        chainId: 17000,
        // nonce: 1001,
        nonce: 0,
        // yParity: 0,
        // r: "0xb0384133579f2b5aa6a269298a456c8dcb4b3422c3ded812111d8c61144a6dd1",
        // s: "0x1569a05ede0b56af6c8434c763712cf1a578c089ed29026e3b7c062c9c2c8b10"

        yParity: 1,
        r: "0xc5ec2404c1ffb8728282d385ecc8f55d8d0c468d4e374d552871ef6e39afe468",
        s: "0x60f1650fc7fa29b3fab92046c87ac0e83d107a4969842d579820e09aafc10dbc"
    } as any;

    const hash = await walletClient.sendTransaction({
        account: sponsorAccount,
        authorizationList: [existingAuthorization],
        to: "0x8c2451ae6edf47e9e17bcfa14062fc783df37d2f",
        data: "0xa6d0ad6100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000600000000000000000000000006b5817e7091bc0c747741e96820b0199388245ea00000000000000000000000000000000000000000000000000038d7ea4c680000000000000000000000000000000000000000000000000000000000000000004d0e30db000000000000000000000000000000000000000000000000000000000",
        value: parseEther("0.0")
    });

    console.log("✅ Alternative replay transaction sent:", holesky.blockExplorers.default.url + "/tx/" + hash);
}


alternativeReplay();