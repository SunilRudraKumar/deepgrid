// components/terminal/trade/TradeForm.tsx
// Main trading form with limit/market orders

'use client';

import React from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { Panel } from '../ui/Panel';
import { cn } from '@/lib/utils';
import { usePoolSelector } from '@/lib/context/PoolSelectorContext';
import { usePolling } from '@/lib/hooks/usePolling';
import { getSummary, type DeepbookNetwork } from '@/lib/deepbook/indexer';
import { buildMarketOrderTransaction, buildLimitOrderTransaction } from '@/lib/deepbook/orders';
import { AmountInput, type AmountUnit } from './AmountInput';

interface TradeFormProps {
    /** Balance Manager ID for executing trades */
    managerId: string | null;
}

type OrderSide = 'buy' | 'sell';
type FormOrderType = 'limit' | 'market';

export function TradeForm({ managerId }: TradeFormProps) {
    const account = useCurrentAccount();
    const dAppKit = useDAppKit();
    const { selectedPool } = usePoolSelector();
    const network = (process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'mainnet') as DeepbookNetwork;

    // Form state
    const [side, setSide] = React.useState<OrderSide>('buy');
    const [orderType, setOrderType] = React.useState<FormOrderType>('limit');
    const [price, setPrice] = React.useState('');
    const [amount, setAmount] = React.useState('');
    const [amountUnit, setAmountUnit] = React.useState<AmountUnit>('base');
    const [postOnly, setPostOnly] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [lastTxDigest, setLastTxDigest] = React.useState<string | null>(null);

    // Get pool info
    const poolKey = selectedPool?.id ?? 'SUI_USDC';
    const baseToken = selectedPool?.baseToken ?? 'SUI';
    const quoteToken = selectedPool?.quoteToken ?? 'USDC';

    // Fetch current market price
    const pricePoll = usePolling(
        React.useCallback(
            () => getSummary({ network }).then((rows) => rows.find((r) => r.trading_pairs === poolKey)?.last_price ?? null),
            [network, poolKey]
        ),
        { intervalMs: 5000 }
    );
    const currentPrice = pricePoll.data ?? 0;

    // Convert amount to base units for order
    const getBaseQuantity = (): number => {
        const numAmount = parseFloat(amount) || 0;
        if (amountUnit === 'base') {
            return numAmount;
        }
        // Convert from quote to base
        return currentPrice > 0 ? numAmount / currentPrice : 0;
    };

    // Handle order submission
    const handleSubmit = async () => {
        if (!account?.address) {
            setError('Connect wallet first');
            return;
        }
        if (!managerId) {
            setError('No trading account found');
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            setError('Enter valid amount');
            return;
        }

        setIsLoading(true);
        setError(null);
        setLastTxDigest(null);

        const quantity = getBaseQuantity();

        console.log(`🔄 [Order] ${side.toUpperCase()} ${quantity.toFixed(4)} ${baseToken} @ ${orderType === 'market' ? 'MARKET' : price}`);

        try {
            let tx;

            if (orderType === 'market') {
                tx = await buildMarketOrderTransaction({
                    walletAddress: account.address,
                    managerId,
                    poolKey,
                    quantity,
                    side,
                    payWithDeep: false,
                    network,
                });
            } else {
                const limitPrice = parseFloat(price);
                if (!limitPrice) {
                    setError('Enter valid price');
                    setIsLoading(false);
                    return;
                }

                tx = await buildLimitOrderTransaction({
                    walletAddress: account.address,
                    managerId,
                    poolKey,
                    quantity,
                    price: limitPrice,
                    side,
                    orderType: postOnly ? 'post_only' : 'no_restriction',
                    payWithDeep: false,
                    network,
                });
            }

            console.log('📝 [Order] Transaction built, requesting signature...');

            const result = await dAppKit.signAndExecuteTransaction({
                transaction: tx,
            });

            // SDK v2: digest is in result.Transaction or get it from effects
            const txDigest = (result as any).digest || (result.Transaction as any)?.digest || 'submitted';
            console.log(`✅ [Order] Success! Digest: ${txDigest}`);
            setLastTxDigest(txDigest);

            // Clear form on success
            setAmount('');
            if (orderType === 'limit') setPrice('');

        } catch (e: any) {
            console.error('❌ [Order] Failed:', e.message);
            setError(e.message || 'Order failed');
        } finally {
            setIsLoading(false);
        }
    };

    const canSubmit = amount && parseFloat(amount) > 0 && (orderType === 'market' || (price && parseFloat(price) > 0));

    return (
        <Panel title={<span className="text-zinc-300">Order</span>}>
            <div className="p-3 space-y-3">
                {/* Buy/Sell Toggle */}
                <div className="grid grid-cols-2 rounded-md bg-black/20 p-1 text-xs">
                    <button
                        onClick={() => setSide('buy')}
                        className={cn(
                            'rounded-md py-2 font-medium transition-all duration-200',
                            side === 'buy'
                                ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                        )}
                    >
                        Buy
                    </button>
                    <button
                        onClick={() => setSide('sell')}
                        className={cn(
                            'rounded-md py-2 font-medium transition-all duration-200',
                            side === 'sell'
                                ? 'bg-rose-500/20 text-rose-400 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                        )}
                    >
                        Sell
                    </button>
                </div>

                {/* Limit/Market Toggle */}
                <div className="flex gap-2 text-xs">
                    <button
                        onClick={() => setOrderType('limit')}
                        className={cn(
                            'rounded-md px-3 py-1.5 transition-colors',
                            orderType === 'limit'
                                ? 'bg-white/10 text-zinc-100 font-medium'
                                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
                        )}
                    >
                        Limit
                    </button>
                    <button
                        onClick={() => setOrderType('market')}
                        className={cn(
                            'rounded-md px-3 py-1.5 transition-colors',
                            orderType === 'market'
                                ? 'bg-white/10 text-zinc-100 font-medium'
                                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
                        )}
                    >
                        Market
                    </button>
                </div>

                {/* Price Input (only for limit orders) */}
                {orderType === 'limit' && (
                    <div>
                        <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
                            <span>Price</span>
                            <span>{quoteToken}</span>
                        </div>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder={currentPrice ? currentPrice.toFixed(4) : '0.0'}
                            className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 outline-none focus:border-white/20 focus:bg-black/30 transition-all font-mono"
                        />
                    </div>
                )}

                {/* Amount Input with SUI/USD Toggle */}
                <AmountInput
                    value={amount}
                    onChange={setAmount}
                    unit={amountUnit}
                    onUnitChange={setAmountUnit}
                    baseToken={baseToken}
                    quoteToken={quoteToken}
                    currentPrice={currentPrice}
                    maxBalance={0}
                />

                {/* Post Only (for limit orders) */}
                {orderType === 'limit' && (
                    <div className="flex items-center text-xs text-zinc-400 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer hover:text-zinc-300">
                            <input
                                type="checkbox"
                                checked={postOnly}
                                onChange={(e) => setPostOnly(e.target.checked)}
                                className="accent-zinc-200 w-3 h-3 rounded"
                            />
                            Post Only
                        </label>
                    </div>
                )}

                {/* Success Message */}
                {lastTxDigest && (
                    <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                        ✓ Order placed!{' '}
                        <a
                            href={`https://suiscan.xyz/${network}/tx/${lastTxDigest}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-emerald-200"
                        >
                            View tx
                        </a>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="p-2 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                        {error}
                    </div>
                )}

                {/* Order Preview */}
                <div className="text-xs text-zinc-500 space-y-1 px-1 pt-2 border-t border-white/5">
                    <div className="flex justify-between">
                        <span>Est. Total</span>
                        <span className="text-zinc-300 font-mono">
                            {amount && currentPrice
                                ? amountUnit === 'base'
                                    ? `${(parseFloat(amount) * currentPrice).toFixed(2)} ${quoteToken}`
                                    : `${amount} ${quoteToken}`
                                : `0.00 ${quoteToken}`}
                        </span>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isLoading}
                    className={cn(
                        'w-full rounded-md py-3 text-sm font-semibold text-white transition-all mt-2',
                        !canSubmit || isLoading
                            ? 'bg-zinc-700 cursor-not-allowed opacity-50'
                            : side === 'buy'
                                ? 'bg-emerald-600 hover:bg-emerald-500 hover:brightness-110 active:scale-[0.98]'
                                : 'bg-rose-600 hover:bg-rose-500 hover:brightness-110 active:scale-[0.98]'
                    )}
                >
                    {isLoading
                        ? 'Signing...'
                        : `${side === 'buy' ? 'Buy' : 'Sell'} ${baseToken}`}
                </button>
            </div>
        </Panel>
    );
}
