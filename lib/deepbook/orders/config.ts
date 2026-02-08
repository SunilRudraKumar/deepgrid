// lib/deepbook/orders/config.ts
// Pool configuration for DeepBook orders - easy to add new pools

import { testnetPackageIds, mainnetPackageIds } from '@mysten/deepbook-v3';

export type Network = 'mainnet' | 'testnet';

/**
 * Get DeepBook package IDs for the given network
 */
export function getPackageIds(network: Network) {
    return network === 'mainnet' ? mainnetPackageIds : testnetPackageIds;
}

/**
 * gRPC URLs for Sui networks
 */
export const GRPC_URLS: Record<Network, string> = {
    mainnet: 'https://fullnode.mainnet.sui.io:443',
    testnet: 'https://fullnode.testnet.sui.io:443',
};

/**
 * Pool configuration including lot_size for order alignment
 * lot_size is in base units (with decimals applied)
 */
export interface PoolConfig {
    id: string;
    lotSize: number; // Minimum order increment in base units
    minSize: number; // Minimum order size in base units
}

export const POOL_CONFIG: Record<Network, Record<string, PoolConfig>> = {
    mainnet: {
        SUI_USDC: {
            id: '0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407',
            lotSize: 100000000,   // 0.1 SUI (9 decimals)
            minSize: 1000000000,  // 1 SUI minimum (from indexer)
        },
        DEEP_SUI: {
            id: '0xb663828d6217467c8a1838a03793da896cbe745b150ebd57d82f814ca579fc22',
            lotSize: 1000000,     // 1 DEEP (6 decimals)
            minSize: 10000000,    // 10 DEEP minimum
        },
        DEEP_USDC: {
            id: '0xf948981b806057580f91622417534f491da5f61aeaf33d0ed8e69fd5691c95ce',
            lotSize: 1000000,     // 1 DEEP (6 decimals)
            minSize: 10000000,    // 10 DEEP minimum
        },
    },
    testnet: {
        SUI_USDC: { id: '0x0', lotSize: 100000000, minSize: 100000000 },
        SUI_DEEP: { id: '0x0', lotSize: 100000000, minSize: 100000000 },
        DEEP_USDC: { id: '0x0', lotSize: 100000000, minSize: 100000000 },
    },
};

/**
 * Pool IDs for DeepBook V3 pools (legacy - use POOL_CONFIG for new code)
 */
export const POOL_IDS: Record<Network, Record<string, string>> = {
    mainnet: {
        SUI_USDC: '0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407',
        SUI_DEEP: '0xb663828d6217467c8a1838a03e86f5f95cb9e5ad0e02bc0c7db8fdecd4494ecc',
        DEEP_USDC: '0xf948981b806057580f91622417534f491c4e4e9e04ff5c7e3f9b22d0ea6b8ed2',
    },
    testnet: {
        SUI_USDC: '0x0',
        SUI_DEEP: '0x0',
        DEEP_USDC: '0x0',
    },
};

/**
 * Get pool object ID for a given pool key and network
 */
export function getPoolId(poolKey: string, network: Network): string | undefined {
    return POOL_IDS[network][poolKey];
}

/**
 * Get pool config for a given pool key and network
 */
export function getPoolConfig(poolKey: string, network: Network): PoolConfig | undefined {
    return POOL_CONFIG[network][poolKey];
}

/**
 * Align quantity to pool's lot_size (round down to nearest lot)
 */
export function alignToLotSize(quantity: number, lotSize: number): number {
    return Math.floor(quantity / lotSize) * lotSize;
}

/**
 * Manager key used for SDK registration
 */
export const MANAGER_KEY = 'DEEPGRID_MANAGER';
