// lib/deepbook/orders/types.ts
// Type definitions for DeepBook orders - modular and reusable

export type OrderSide = 'buy' | 'sell';

export type OrderType =
    | 'no_restriction'      // Normal limit order
    | 'immediate_or_cancel' // IOC - fill what you can, cancel rest
    | 'fill_or_kill'        // FOK - fill entirely or cancel
    | 'post_only';          // Maker only

export type SelfMatchingOption =
    | 'self_matching_allowed'
    | 'cancel_taker'
    | 'cancel_maker';

/**
 * Base order parameters shared by market and limit orders
 */
export interface BaseOrderParams {
    /** Pool ID in format "SUI_USDC", "SUI_DEEP", etc. */
    poolKey: string;
    /** Balance Manager object ID (0x...) */
    managerId: string;
    /** Client-generated order ID for tracking */
    clientOrderId: string;
    /** Order quantity in base token units */
    quantity: number;
    /** Order side: buy or sell */
    side: OrderSide;
    /** Whether to pay fees with DEEP token (default: true for lower fees) */
    payWithDeep?: boolean;
    /** Self-matching behavior (default: cancel_taker) */
    selfMatchingOption?: SelfMatchingOption;
}

/**
 * Market order parameters
 */
export interface MarketOrderParams extends BaseOrderParams {
    type: 'market';
}

/**
 * Limit order parameters
 */
export interface LimitOrderParams extends BaseOrderParams {
    type: 'limit';
    /** Limit price in quote token units */
    price: number;
    /** Order type behavior */
    orderType?: OrderType;
    /** Expiration timestamp in seconds (0 = no expiration) */
    expiration?: number;
}

/**
 * Union type for any order
 */
export type OrderParams = MarketOrderParams | LimitOrderParams;

/**
 * Result from order execution
 */
export interface OrderResult {
    success: boolean;
    digest?: string;
    error?: string;
    orderId?: string;
}
