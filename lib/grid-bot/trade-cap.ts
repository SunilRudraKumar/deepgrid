// lib/grid-bot/trade-cap.ts
// Functions for minting and managing TradeCap for Grid Bot
// Uses correct Sui Core API patterns with changedObjects + objectTypes

import { deepbook } from '@mysten/deepbook-v3';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';

const LOG_PREFIX = '[TradeCap]';

type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

const GRPC_URLS: Record<Network, string> = {
    mainnet: 'https://fullnode.mainnet.sui.io:443',
    testnet: 'https://fullnode.testnet.sui.io:443',
    devnet: 'https://fullnode.devnet.sui.io:443',
    localnet: 'http://127.0.0.1:9000',
};

/**
 * Builds a transaction to mint a TradeCap for the user's Balance Manager.
 * TradeCap grants trading rights to the holder (e.g., the Grid Bot).
 * The TradeCap is transferred to the user's wallet address.
 */
export async function buildMintTradeCapTransaction(
    walletAddress: string,
    balanceManagerId: string,
    managerKey: string,
    network: string = 'testnet'
): Promise<Transaction> {
    console.log(LOG_PREFIX, 'buildMintTradeCapTransaction called', {
        walletAddress: walletAddress.slice(0, 16) + '...',
        balanceManagerId: balanceManagerId.slice(0, 16) + '...',
        managerKey,
        network,
    });

    const baseUrl = GRPC_URLS[network as Network] || GRPC_URLS['testnet'];
    console.log(LOG_PREFIX, 'Using GRPC URL:', baseUrl);

    // Create client with DeepBook extension
    // NOTE: balanceManagers format must be { [key]: { address: managerId } }
    console.log(LOG_PREFIX, 'Creating SuiGrpcClient with DeepBook extension...');
    const client = new SuiGrpcClient({
        network: network as Network,
        baseUrl
    }).$extend(deepbook({
        address: walletAddress,
        balanceManagers: {
            [managerKey]: {
                address: balanceManagerId,
            }
        }
    }));

    console.log(LOG_PREFIX, 'Client created, building transaction...');
    const tx = new Transaction();

    // Mint the TradeCap - this returns the TradeCap object
    console.log(LOG_PREFIX, 'Adding mintTradeCap call for managerKey:', managerKey);
    const tradeCap = client.deepbook.balanceManager.mintTradeCap(managerKey);

    // IMPORTANT: Transfer the TradeCap to the user's wallet address
    // Without this, the transaction fails with "UnusedValueWithoutDrop" error
    console.log(LOG_PREFIX, 'Transferring TradeCap to wallet:', walletAddress.slice(0, 16) + '...');
    tx.add(tradeCap);
    tx.transferObjects([tradeCap], walletAddress);

    console.log(LOG_PREFIX, 'Transaction built successfully');
    return tx;
}

/**
 * Find TradeCap ID from transaction result using changedObjects + objectTypes pattern.
 * This is the recommended approach per Sui SDK docs (DeepBook example pattern).
 */
export function findTradeCapFromResult(result: any): string | null {
    console.log(LOG_PREFIX, 'findTradeCapFromResult called');

    // Access objectTypes and changedObjects from Transaction result
    const objectTypes = result?.objectTypes ?? {};
    const changedObjects = result?.effects?.changedObjects ?? [];

    console.log(LOG_PREFIX, 'objectTypes:', objectTypes);
    console.log(LOG_PREFIX, 'changedObjects count:', changedObjects.length);

    // Find created object with TradeCap type (following DeepBook pattern)
    const tradeCapObject = changedObjects.find((obj: any) => {
        const isCreated = obj?.idOperation === 'Created';
        const objType = objectTypes[obj?.objectId] ?? '';
        const isTradeCap = objType.includes('TradeCap') || objType.includes('trade_cap');

        if (obj?.objectId) {
            console.log(LOG_PREFIX, 'Checking object:', {
                objectId: obj.objectId,
                idOperation: obj.idOperation,
                type: objType,
                isTradeCap,
            });
        }

        return isCreated && isTradeCap;
    });

    if (tradeCapObject?.objectId) {
        console.log(LOG_PREFIX, 'Found TradeCap:', tradeCapObject.objectId);
        return tradeCapObject.objectId;
    }

    console.log(LOG_PREFIX, 'TradeCap not found in changedObjects');
    return null;
}

/**
 * Find TradeCap ID by querying transaction from chain using Core API.
 * Uses client.core.getTransaction with proper include options.
 */
export async function findTradeCapFromDigest(
    digest: string,
    network: string = 'mainnet'
): Promise<string | null> {
    console.log(LOG_PREFIX, 'findTradeCapFromDigest called', { digest, network });

    const baseUrl = GRPC_URLS[network as Network] || GRPC_URLS['mainnet'];
    const client = new SuiGrpcClient({ network: network as Network, baseUrl });

    try {
        // Use core API with proper include options
        const result = await client.core.getTransaction({
            digest,
            include: { effects: true, objectTypes: true },
        });

        console.log(LOG_PREFIX, 'Transaction fetched from chain');

        // Use the same pattern as findTradeCapFromResult
        const objectTypes = result.Transaction?.objectTypes ?? {};
        const changedObjects = result.Transaction?.effects?.changedObjects ?? [];

        console.log(LOG_PREFIX, 'objectTypes:', objectTypes);
        console.log(LOG_PREFIX, 'changedObjects count:', changedObjects.length);

        // Find created TradeCap
        const tradeCapObject = changedObjects.find((obj: any) => {
            const isCreated = obj?.idOperation === 'Created';
            const objType = objectTypes[obj?.objectId] ?? '';
            const isTradeCap = objType.includes('TradeCap') || objType.includes('trade_cap');

            return isCreated && isTradeCap;
        });

        if (tradeCapObject?.objectId) {
            console.log(LOG_PREFIX, 'Found TradeCap from digest:', tradeCapObject.objectId);
            return tradeCapObject.objectId;
        }

        console.log(LOG_PREFIX, 'TradeCap not found in transaction effects');
        return null;
    } catch (err) {
        console.error(LOG_PREFIX, 'Error fetching transaction:', err);
        return null;
    }
}
