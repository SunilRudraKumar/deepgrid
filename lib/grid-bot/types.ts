// lib/grid-bot/types.ts
// Type definitions for Grid Bot

export type Side = 'BUY' | 'SELL';

export interface GridConfig {
    /** Lower price bound (human readable, e.g., 3.50) */
    min: number;
    /** Upper price bound (human readable, e.g., 4.50) */
    max: number;
    /** Number of grid levels */
    grids: number;
    /** Base asset size per grid order (human readable, e.g., 1 = 1 SUI) */
    sizePerGrid: number;
    /** Total investment amount in quote currency (e.g., USDC) */
    totalInvestment?: number;
}

export interface GridLevel {
    /** Grid level index (0 = lowest) */
    index: number;
    /** Price at this level (human readable) */
    price: number;
    /** Price in micro units (for DeepBook) */
    priceMicro: number;
    /** Order side at initial placement */
    side: Side | null;
}

export interface GridOrder {
    side: Side;
    price: number;
    priceMicro: number;
    size: number;
    orderId?: string;
    clientOrderId?: string;
    status: 'pending' | 'open' | 'filled' | 'cancelled';
}

export interface GridState {
    config: GridConfig;
    levels: GridLevel[];
    orders: GridOrder[];
    pivotIndex: number;
    midPrice: number;
    status: 'idle' | 'calculating' | 'ready' | 'running' | 'paused' | 'stopped' | 'error';
    error?: string;
}

export interface BookParams {
    tickSize: number;
    lotSize: number;
    minSize: number;
}

export interface GridCalculationResult {
    levels: GridLevel[];
    initialOrders: GridOrder[];
    pivotIndex: number;
    stepSize: number;
    tickMicro: number;
}
