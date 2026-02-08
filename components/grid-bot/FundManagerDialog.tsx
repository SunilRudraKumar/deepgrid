// components/grid-bot/FundManagerDialog.tsx
'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface FundManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onDeposit: (amount: number, coinKey: string) => Promise<string | null>;
    balanceManagerId: string | null;
}

export default function FundManagerDialog({
    isOpen,
    onClose,
    onDeposit,
    balanceManagerId,
}: FundManagerDialogProps) {
    const [amount, setAmount] = useState<string>('1');
    const [coinKey, setCoinKey] = useState<string>('SUI'); // Default to SUI for now
    const [isDepositing, setIsDepositing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsDepositing(true);

        try {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                throw new Error('Please enter a valid amount');
            }

            const digest = await onDeposit(numAmount, coinKey);
            if (digest) {
                onClose();
                setAmount('1'); // Reset
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Deposit failed');
        } finally {
            setIsDepositing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[#0f141b] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-xl">
                <h2 className="text-xl font-semibold mb-2">Fund Grid Bot</h2>
                <p className="text-sm text-white/50 mb-6">
                    Deposit assets into your Balance Manager to start trading.
                    <br />
                    <span className="text-xs font-mono text-white/30 truncate block mt-1">
                        ID: {balanceManagerId}
                    </span>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-white/50 mb-1">Asset</label>
                        <select
                            value={coinKey}
                            onChange={(e) => setCoinKey(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        >
                            <option value="SUI">SUI</option>
                            <option value="USDC">USDC</option>
                            <option value="DEEP">DEEP</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-white/50 mb-1">Amount</label>
                        <input
                            type="number"
                            step="any"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            placeholder="0.00"
                        />
                    </div>

                    {error && (
                        <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded text-sm font-medium text-white/70 hover:text-white"
                            disabled={isDepositing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isDepositing}
                            className={cn(
                                "px-4 py-2 rounded text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors",
                                isDepositing && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isDepositing ? 'Depositing...' : 'Deposit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
