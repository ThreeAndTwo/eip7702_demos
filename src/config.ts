// 读取 .env 配置文件
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

export const PRIVATE_KEY = (process.env.PRIVATE_KEY || '') as `0x${string}`;
export const SPONSOR_PRIVATE_KEY = (process.env.SPONSOR_PRIVATE_KEY || '') as `0x${string}`;
export const SEPOLIA_RPC = process.env.SEPOLIA_RPC || '';
export const HOLESKY_RPC = process.env.HOLESKY_RPC || '';
export const SEPOLIA_BATCH_ETH_DELEGATION_CA = (process.env.SEPOLIA_BATCH_ETH_DELEGATION_CA || '') as `0x${string}`;
export const HOLESKY_BATCH_ETH_DELEGATION_CA = (process.env.HOLESKY_BATCH_ETH_DELEGATION_CA || '') as `0x${string}`;

export const SEPOLIA_WETH = (process.env.SEPOLIA_WETH || '') as `0x${string}`;
export const SEPOLIA_SYMBIOTIC_OPERATOR_REGISTRY = (process.env.SEPOLIA_SYMBIOTIC_OPERATOR_REGISTRY || '') as `0x${string}`;
export const SEPOLIA_SYMBIOTIC_OPT_IN_SERVICE = (process.env.SEPOLIA_SYMBIOTIC_OPT_IN_SERVICE || '') as `0x${string}`;

// abis
export const SEPOLIA_BATCH_ETH_DELEGATION_ABI = JSON.parse(fs.readFileSync('./abis/batch_eth_delegation.json', 'utf8'));
export const SEPOLIA_SEPOLIA_OPERATOR_REGISTRY_ABI = JSON.parse(fs.readFileSync('./abis/sepolia_operator_registry.json', 'utf8'));
export const SEPOLIA_OPT_IN_ABI = JSON.parse(fs.readFileSync('./abis/sepolia_opt_in.json', 'utf8'));
