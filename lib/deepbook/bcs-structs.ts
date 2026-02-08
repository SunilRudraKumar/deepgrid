
import { bcs } from '@mysten/sui/bcs';

/**
 * DeepBook V3 Order Deep Price Struct
 * Used for fee calculation in DEEP
 */
export const OrderDeepPriceStruct = bcs.struct('OrderDeepPrice', {
    asset_is_base: bcs.bool(),
    deep_per_asset: bcs.u64(),
});

/**
 * DeepBook V3 Order Struct Definition
 * Represents the on-chain Order struct
 */
export const OrderStruct = bcs.struct('Order', {
    balance_manager_id: bcs.Address,
    order_id: bcs.u128(),
    client_order_id: bcs.u64(),
    quantity: bcs.u64(),
    filled_quantity: bcs.u64(),
    fee_is_deep: bcs.bool(),
    order_deep_price: OrderDeepPriceStruct,
    epoch: bcs.u64(),
    status: bcs.u8(),
    expire_timestamp: bcs.u64(),
});

export type Order = ReturnType<typeof OrderStruct.parse>;
