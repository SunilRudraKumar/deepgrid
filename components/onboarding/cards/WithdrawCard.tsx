'use client';

import React, { useState } from 'react';
import { useWithdraw } from '@/lib/hooks/useWithdraw';
import { AmountInput } from '@/components/terminal/trade/AmountInput';

interface WithdrawCardProps {
    managerId: string;
    availableBalances: { coinKey: string; balance: number }[];
    onSuccess: () => void;
    onBack: () => void;
}

export default function WithdrawCard({ managerId, availableBalances, onSuccess, onBack }: WithdrawCardProps) {
    const { withdraw, withdrawAll, status, error, reset } = useWithdraw();
    const [selectedCoin, setSelectedCoin] = useState('SUI');
    const [amount, setAmount] = useState('');
    const [isWithdrawAll, setIsWithdrawAll] = useState(false);

    const available = availableBalances.find(b => b.coinKey === selectedCoin)?.balance || 0;
    const isProcessing = status === 'building' || status === 'signing';

    const handleWithdraw = async () => {
        if (!amount && !isWithdrawAll) return;

        let digest: string | null = null;
        if (isWithdrawAll) {
            digest = await withdrawAll(managerId, selectedCoin);
        } else {
            digest = await withdraw(managerId, selectedCoin, parseFloat(amount));
        }

        if (digest) {
            setTimeout(() => {
                onSuccess();
            }, 2000);
        }
    };

    if (status === 'success') {
        return (
            <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Withdrawal Successful!</h3>
                <p className="text-sm text-gray-400 mb-6">Funds have been sent to your wallet.</p>
                <div className="flex gap-3">
                    <button
                        onClick={onBack}
                        className="flex-1 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={() => { reset(); setAmount(''); setIsWithdrawAll(false); }}
                        className="flex-1 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
                    >
                        Withdraw More
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Asset Selector */}
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Asset</label>
                <div className="grid grid-cols-2 gap-2">
                    {['SUI', 'USDC'].map((coin) => (
                        <button
                            key={coin}
                            onClick={() => { setSelectedCoin(coin); setAmount(''); setIsWithdrawAll(false); }}
                            className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${selectedCoin === coin
                                ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                                : 'bg-[#0b0f14] border-white/5 text-gray-400 hover:border-white/10'
                                }`}
                        >
                            {coin}
                        </button>
                    ))}
                </div>
            </div>

            {/* Amount Input */}
            <div>
                <div className="flex justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-400">Amount</label>
                    <span className="text-xs text-gray-500">
                        Available: {available.toFixed(4)} {selectedCoin}
                    </span>
                </div>

                <div className="relative">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value);
                            setIsWithdrawAll(false);
                        }}
                        placeholder="0.00"
                        className="w-full bg-[#0b0f14] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                        disabled={isWithdrawAll}
                    />
                    <button
                        onClick={() => {
                            setAmount(available.toString());
                            setIsWithdrawAll(true);
                        }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded transition-colors ${isWithdrawAll
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/5 text-blue-400 hover:bg-white/10'}`}
                    >
                        MAX
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                    {error}
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button
                    onClick={onBack}
                    className="flex-1 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleWithdraw}
                    disabled={isProcessing || (!amount && !isWithdrawAll) || parseFloat(amount) > available}
                    className="flex-1 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? 'Processing...' : 'Withdraw'}
                </button>
            </div>
        </div>
    );
}
