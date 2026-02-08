// lib/deepbook/indexer.ts
// DeepBookV3 Indexer API client - modular and pool-agnostic

export type DeepbookNetwork = 'mainnet' | 'testnet';

/**
 * Get the DeepBook indexer base URL for the given network
 */
export function deepbookIndexerBaseUrl(network: DeepbookNetwork): string {
    return network === 'mainnet'
        ? 'https://deepbook-indexer.mainnet.mystenlabs.com'
        : 'https://deepbook-indexer.testnet.mystenlabs.com';
}

// --- Utility functions ---

function withTimeout(ms: number) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return { controller, cancel: () => clearTimeout(id) };
}

async function fetchJson<T>(url: string, opts?: { timeoutMs?: number; cache?: RequestCache }): Promise<T> {
    const { controller, cancel } = withTimeout(opts?.timeoutMs ?? 8_000);
    try {
        const res = await fetch(url, { signal: controller.signal, cache: opts?.cache ?? 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        return (await res.json()) as T;
    } finally {
        cancel();
    }
}

// --- Response types ---

export type OrderbookResponse = {
    timestamp: string; // unix ms as string
    bids: [string, string][]; // [price, size]
    asks: [string, string][];
};

export type OhlcvResponse = {
    candles: [number, number, number, number, number, number][]; // [t, o, h, l, c, v]
};

export type Trade = {
    price: number;
    base_volume: number;
    quote_volume: number;
    timestamp: number; // unix ms
    type: 'buy' | 'sell';
};

export type SummaryRow = {
    trading_pairs: string; // pool name (e.g. SUI_USDC)
    last_price: number;
    price_change_percent_24h: number;
    base_volume: number;
    quote_volume: number;
    lowest_ask: number;
    highest_bid: number;
};

export type PoolInfo = {
    pool_id: string;
    pool_name: string;
    base_asset: string;
    quote_asset: string;
};

// --- API Functions ---

/**
 * Get list of available pools
 */
export async function getPools(params: { network: DeepbookNetwork }): Promise<PoolInfo[]> {
    const base = deepbookIndexerBaseUrl(params.network);
    return fetchJson<PoolInfo[]>(`${base}/get_pools`, { cache: 'no-store' });
}

/**
 * Get orderbook for a pool
 */
export async function getOrderbook(params: {
    network: DeepbookNetwork;
    pool: string;      // e.g. "SUI_USDC"
    level?: 1 | 2;
    depth?: number;    // e.g. 40 => 20 bids + 20 asks
}): Promise<OrderbookResponse> {
    const base = deepbookIndexerBaseUrl(params.network);
    const q = new URLSearchParams();
    q.set('level', String(params.level ?? 2));
    if (params.depth !== undefined) q.set('depth', String(params.depth));
    return fetchJson<OrderbookResponse>(`${base}/orderbook/${params.pool}?${q.toString()}`, { cache: 'no-store' });
}

/**
 * Get OHLCV candles for a pool
 */
export async function getOhlcv(params: {
    network: DeepbookNetwork;
    pool: string;
    interval: CandleInterval;
    startTimeSec?: number;
    endTimeSec?: number;
    limit?: number;
}): Promise<OhlcvResponse> {
    const base = deepbookIndexerBaseUrl(params.network);
    const q = new URLSearchParams();
    q.set('interval', params.interval);
    if (params.startTimeSec) q.set('start_time', String(params.startTimeSec));
    if (params.endTimeSec) q.set('end_time', String(params.endTimeSec));
    if (params.limit) q.set('limit', String(params.limit));
    return fetchJson<OhlcvResponse>(`${base}/ohclv/${params.pool}?${q.toString()}`, { cache: 'no-store' });
}

/**
 * Get recent trades for a pool
 */
export async function getTrades(params: {
    network: DeepbookNetwork;
    pool: string;
    limit?: number;
}): Promise<Trade[]> {
    const base = deepbookIndexerBaseUrl(params.network);
    const q = new URLSearchParams();
    if (params.limit) q.set('limit', String(params.limit));
    return fetchJson<Trade[]>(`${base}/trades/${params.pool}?${q.toString()}`, { cache: 'no-store' });
}

/**
 * Get 24h summary for all pools
 */
export async function getSummary(params: { network: DeepbookNetwork }): Promise<SummaryRow[]> {
    const base = deepbookIndexerBaseUrl(params.network);
    return fetchJson<SummaryRow[]>(`${base}/summary`, { cache: 'no-store' });
}

// --- Helpers ---

export type CandleInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export const CANDLE_INTERVALS: CandleInterval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

/**
 * Normalize timestamp to seconds (handles both seconds and ms)
 */
export function normalizeUnixToSeconds(t: number): number {
    return t > 1e12 ? Math.floor(t / 1000) : t;
}

/**
 * Convert pool ID from config format to indexer format
 * e.g. "SUI_USDC" stays "SUI_USDC"
 */
export function poolIdToIndexerFormat(poolId: string): string {
    return poolId; // Already in correct format
}
