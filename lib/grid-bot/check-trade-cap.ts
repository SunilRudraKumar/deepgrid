// lib/grid-bot/check-trade-cap.ts
// Check if user has existing TradeCaps for their Balance Manager
// Optimized: Fetches content directly in listOwnedObjects to avoid N+1 RpcError

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { deepbook } from '@mysten/deepbook-v3';
import { bcs } from '@mysten/sui/bcs';

const LOG_PREFIX = '[CheckTradeCap]';

type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

const GRPC_URLS: Record<Network, string> = {
    mainnet: 'https://fullnode.mainnet.sui.io:443',
    testnet: 'https://fullnode.testnet.sui.io:443',
    devnet: 'https://fullnode.devnet.sui.io:443',
    localnet: 'http://127.0.0.1:9000',
};

// DeepBook TradeCap type patterns to match
const TRADE_CAP_TYPE_PATTERNS = [
    'balance_manager::TradeCap',
    'TradeCap',
];

/**
 * Check if user has any TradeCap objects in their wallet.
 * Uses SuiGrpcClient with optimized listOwnedObjects to fetch content in one go.
 */
export async function checkExistingTradeCap(
    walletAddress: string,
    balanceManagerId?: string | null,
    network: string = 'mainnet'
): Promise<{ exists: boolean; tradeCapId: string | null; tradeCapIds: string[] }> {
    console.log(LOG_PREFIX, 'checkExistingTradeCap called', {
        walletAddress: walletAddress.slice(0, 16) + '...',
        balanceManagerId,
        network
    });

    const baseUrl = GRPC_URLS[network as Network] || GRPC_URLS['mainnet'];

    // Initialize standard gRPC client extended with DeepBook
    const client = new SuiGrpcClient({
        network: network as Network,
        baseUrl
    }).$extend(deepbook({
        address: walletAddress,
        balanceManagers: balanceManagerId ? { 'MAIN': { address: balanceManagerId } } : undefined
    }));

    try {
        // 1. Get all owned objects WITH JSON content + type
        // Fix: SuiGrpcClient requires 'include.json' to return readable fields (not BCS bytes)
        const response = await client.core.listOwnedObjects({
            owner: walletAddress,
            // Use 'include' for gRPC client options (json, type)
            include: {
                json: true, // This is key to get readable content!
                type: true,
            },
            // Keep 'options' for compatibility if the client implementation varies
            options: {
                showType: true,
                showContent: true,
                showDisplay: true,
            }
        } as any);

        const objects = response.objects ?? [];
        const validTradeCaps: string[] = [];

        // 2. Iterate and check content locally
        for (const obj of objects) {
            // Fix: Access properties defensively (top-level vs nested data)
            const type = (obj as any).type ?? (obj as any).data?.type ?? '';
            const isTradeCap = TRADE_CAP_TYPE_PATTERNS.some(pattern =>
                type.includes(pattern)
            );

            const objectId = (obj as any).objectId ?? (obj as any).data?.objectId;

            // Fix: Access JSON content specifically when available
            // In gRPC client, 'json' property holds the parsed fields
            const jsonContent = (obj as any).json ?? (obj as any).data?.json ?? (obj as any).content ?? (obj as any).data?.content;

            if (isTradeCap && objectId) {
                // If it's a Move object, the json content usually has fields
                // Handle different shapes: { fields: {...} } or direct {...}
                let fields = jsonContent;
                if (jsonContent && jsonContent.fields) {
                    fields = jsonContent.fields;
                } else if (jsonContent && jsonContent.dataType === 'moveObject' && jsonContent.fields) {
                    fields = jsonContent.fields;
                }

                if (fields) {
                    if (balanceManagerId) {
                        const capsManagerId = fields.balance_manager_id || fields.balance_manager || fields.account_id || fields.account;
                        // Handle potential ID wrapper { id: "..." }
                        const normalizedCapsManagerId = (typeof capsManagerId === 'object' && capsManagerId !== null && 'id' in capsManagerId)
                            ? (capsManagerId as any).id
                            : capsManagerId;

                        const nCapId = String(normalizedCapsManagerId).toLowerCase();
                        const nExpected = String(balanceManagerId).toLowerCase();

                        const msgIdClean = nCapId.startsWith('0x') ? nCapId : `0x${nCapId}`;
                        const expectedClean = nExpected.startsWith('0x') ? nExpected : `0x${nExpected}`;

                        if (msgIdClean === expectedClean) {
                            validTradeCaps.push(objectId);
                        }
                    } else {
                        validTradeCaps.push(objectId);
                    }
                }
            }
        }

        return {
            exists: validTradeCaps.length > 0,
            tradeCapId: validTradeCaps[0] ?? null,
            tradeCapIds: validTradeCaps,
        };
    } catch (err) {
        console.error(LOG_PREFIX, 'Error checking TradeCaps:', err);
        return { exists: false, tradeCapId: null, tradeCapIds: [] };
    }
}
