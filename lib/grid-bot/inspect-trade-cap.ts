// lib/grid-bot/inspect-trade-cap.ts
// Inspect a TradeCap object to see its fields

import { SuiGrpcClient } from '@mysten/sui/grpc';

const LOG_PREFIX = '[InspectTradeCap]';

const NETWORK = 'mainnet';
const BASE_URL = 'https://fullnode.mainnet.sui.io:443';

async function inspectTradeCap(objectId: string) {
    console.log(LOG_PREFIX, 'Inspecting object:', objectId);

    const client = new SuiGrpcClient({ network: NETWORK, baseUrl: BASE_URL });

    try {
        const response = await client.core.getObject({
            objectId,
            options: {
                showContent: true,
                showType: true,
                showOwner: true,
            },
        });

        console.log(LOG_PREFIX, 'Object details:', JSON.stringify(response, null, 2));
    } catch (err) {
        console.error(LOG_PREFIX, 'Error inspecting object:', err);
    }
}

// Run if called directly
const objectId = process.argv[2];
if (objectId) {
    inspectTradeCap(objectId);
} else {
    console.log('Usage: npx tsx lib/grid-bot/inspect-trade-cap.ts <OBJECT_ID>');
}
