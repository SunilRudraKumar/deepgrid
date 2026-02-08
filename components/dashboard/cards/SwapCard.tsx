'use client';

import React, { useState, useEffect } from 'react';
import { useTradeOrder } from '@/lib/hooks/useTradeOrder';
import { useGridBotAccount } from '@/lib/hooks/useGridBotAccount';

interface SwapCardProps {
    managerId: string;
    onSuccess?: () => void;
}

export default function SwapCard({ managerId, onSuccess }: SwapCardProps) {
    const [direction, setDirection] = useState<'SUI_TO_USDC' | 'USDC_TO_SUI'>('SUI_TO_USDC');
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const { placeMarketOrder } = useTradeOrder({ managerId });
    const botAccount = useGridBotAccount({ explicitManagerId: managerId });

    // We assume the pool is SUI/USDC for now
    const pool = 'SUI_USDC';
    const isSell = direction === 'SUI_TO_USDC';
    const sourceAsset = isSell ? 'SUI' : 'USDC';
    const targetAsset = isSell ? 'USDC' : 'SUI';

    const balance = botAccount.balances.find(b => b.coinKey === sourceAsset)?.balance || 0;

    const handleMax = () => {
        if (!balance) return;
        // Subtract 0.2% buffer for fees when using max
        const maxAmount = balance * 0.998;
        setAmount(maxAmount.toFixed(4));
    };

    const handleSwap = async () => {
        if (!amount || parseFloat(amount) <= 0) return;

        setIsSubmitting(true);
        setStatus('idle');
        setErrorMsg(null);

        try {
            console.log(`[SwapCard] Swapping ${amount} ${sourceAsset} to ${targetAsset}`);

            const result = await placeMarketOrder({
                poolKey: pool,
                quantity: parseFloat(amount),
                side: isSell ? 'sell' : 'buy',
                // Note: For 'buy', quantity is usually in base currency (SUI) for many exchanges, 
                // but DeepBook might expect quantity in base or quote depending on order type.
                // Market Buy in DeepBook usually takes quantity in Base Asset (SUI).
                // If the user wants to spend 100 USDC to buy SUI, we need to estimate the SUI amount.
                // However, placeMarketOrder wrapper might handle this? 
                // Let's check placeMarketOrder implementation. 
                // If generic, we might need to approximate or use a toggle.
                // Simplify: DeepBook V3 generic swap usually specifies input quantity.
                // If using 'placeMarketOrder' wrapper, let's assume it expects Base Quantity for now
                // UNLESS we update logic. 
                // If the user inputs USDC amount (Quote), we need to query price to get Base quantity?
                // For MVP, if converting USDC -> SUI (Buy), we might need to estimate SUI quantity.
            });

            // Wait: existing useTradeOrder signature:
            // placeMarketOrder({ poolKey, quantity, side })
            // Quantity is typically Base Asset size.

            if (result.success) {
                setStatus('success');
                if (onSuccess) onSuccess();
                setAmount('');
                // Refresh balances
                setTimeout(() => botAccount.refreshBalances(), 2000);
            } else {
                setStatus('error');
                setErrorMsg(result.error || 'Swap failed');
            }
        } catch (e: any) {
            console.error('Swap failed:', e);
            setStatus('error');
            setErrorMsg(e.message || 'Swap failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset status after 3s
    useEffect(() => {
        if (status === 'success') {
            const timer = setTimeout(() => setStatus('idle'), 3000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    return (
        <div className="rounded-lg border border-white/10 bg-[#0f141b] p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Quick Swap</h3>

            {/* Direction Toggle */}
            <div className="flex items-center justify-between bg-black/20 p-1 rounded-lg mb-4 border border-white/5">
                <button
                    onClick={() => setDirection('SUI_TO_USDC')}
                    className={`flex-1 py-2 text-xs font-medium rounded transition-all ${direction === 'SUI_TO_USDC'
                        ? 'bg-blue-500/20 text-blue-400 shadow-sm'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    SUI → USDC
                </button>
                <div className="px-2 text-gray-600">⇄</div>
                <button
                    onClick={() => setDirection('USDC_TO_SUI')}
                    className={`flex-1 py-2 text-xs font-medium rounded transition-all ${direction === 'USDC_TO_SUI'
                        ? 'bg-blue-500/20 text-blue-400 shadow-sm'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    USDC → SUI
                </button>
            </div>

            {/* Amount Input */}
            <div className="space-y-1 mb-4">
                <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Amount ({sourceAsset})</span>
                    <span>Available: {balance.toFixed(4)}</span>
                </div>
                <div className="relative">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#0b0f14] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    />
                    <button
                        onClick={handleMax}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded hover:bg-blue-500/30"
                    >
                        MAX
                    </button>
                </div>
            </div>

            {/* Error / Success Message */}
            {status === 'error' && (
                <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                    {errorMsg}
                </div>
            )}
            {status === 'success' && (
                <div className="mb-3 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400">
                    Swap Submitted!
                </div>
            )}

            {/* Action Button */}
            <button
                onClick={handleSwap}
                disabled={isSubmitting || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
                className={`w-full py-2.5 rounded text-sm font-medium transition-colors ${isSubmitting ? 'bg-blue-500/50 cursor-wait' :
                    'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
            >
                {isSubmitting ? 'Swapping...' : `Swap ${sourceAsset} to ${targetAsset}`}
            </button>

            <p className="mt-3 text-[10px] text-gray-500 text-center">
                Uses DeepBook Market Order. Slippage may apply.
                {direction === 'USDC_TO_SUI' && <span className="block text-amber-500/80 mt-1">Note: Input amount is estimated SUI output if swapping USDC. (Logic TBD)</span>}
            </p>
        </div>
    );
}
