// 测试跨链 指定 chain id

import { parseEther } from "viem";
import { encodeFunctionData } from "viem";
import { createWalletClient, http } from "viem";
import { sepolia, holesky } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { eip7702Actions } from "viem/experimental";

import * as config from './config';


async function main() {
     // 0. init account and client
     const account = privateKeyToAccount(config.PRIVATE_KEY);
     const walletClient = createWalletClient({
         account,
         chain: sepolia,
         transport: http(config.SEPOLIA_RPC),
     }).extend(eip7702Actions());
 
     // 
     walletClient.prepareAuthorization({
         account,
         chainId: holesky.id,
         contractAddress:  config.SEPOLIA_BATCH_ETH_DELEGATION_CA,
     })

     // 1. Authorize injection of the Contract's bytecode into our Account.
     const authorization = await walletClient.signAuthorization({
         account,
         chainId: holesky.id,
         contractAddress:  config.SEPOLIA_BATCH_ETH_DELEGATION_CA,
     });
}

main();