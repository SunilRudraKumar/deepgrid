// lib/deepbook/orders/index.ts
// Order module exports - clean barrel file

// Types
export * from './types';

// Config
export {
    GRPC_URLS,
    MANAGER_KEY,
    POOL_IDS,
    getPoolId,
    getPackageIds,
    type Network
} from './config';

// Transaction builders
export {
    buildMarketOrderTransaction,
    type BuildMarketOrderParams
} from './market-order';

export {
    buildLimitOrderTransaction,
    type BuildLimitOrderParams
} from './limit-order';
