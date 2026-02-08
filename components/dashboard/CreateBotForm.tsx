'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { createTradingAccountTransaction } from '@/lib/features/deepbook/create-account';
import { registerBot } from '@/lib/actions/bot-actions';

export function CreateBotForm() {
    const router = useRouter();
    const account = useCurrentAccount();
    const dAppKit = useDAppKit();

    const [name, setName] = React.useState('');
    const [type, setType] = React.useState<'GRID' | 'DCA'>('GRID');
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!account?.address) {
            setError('Please connect your wallet first');
            return;
        }

        if (!name.trim()) {
            setError('Please enter a bot name');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Prepare Transaction
            const tx = await createTradingAccountTransaction(account.address, 'mainnet');

            // 2. Execute on Chain
            const result = await dAppKit.signAndExecuteTransaction({
                transaction: tx,
            });

            // Check for failed transaction
            if (result.$kind === 'FailedTransaction') {
                const errorStatus = result.FailedTransaction?.status?.error;
                const errorMsg = typeof errorStatus === 'string' ? errorStatus : 'Transaction failed';
                throw new Error(errorMsg);
            }

            console.log('Bot created on chain');

            // 3. Wait briefly for indexer
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 4. For now, redirect to dashboard since parsing objectChanges from this SDK type is complex
            // The dashboard will show the new bot once indexed
            alert('Bot created successfully! Redirecting to dashboard...');
            router.push('/dashboard');

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred');
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto bg-[#0f141b] border border-white/10 rounded-xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">Create New Bot</h2>

            <form onSubmit={handleCreate} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Bot Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. SUI Aggressive Grid"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Strategy
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setType('GRID')}
                            className={`p-4 rounded-lg border text-center transition-all ${type === 'GRID'
                                ? 'bg-blue-600 border-transparent text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            <span className="block font-bold mb-1">Grid Bot</span>
                            <span className="text-xs opacity-70">Buy Low / Sell High</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('DCA')}
                            className={`p-4 rounded-lg border text-center transition-all ${type === 'DCA'
                                ? 'bg-purple-600 border-transparent text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                            disabled
                        >
                            <span className="block font-bold mb-1">DCA Bot</span>
                            <span className="text-xs opacity-70">Coming Soon</span>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading || !account}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Creating On-Chain...' : 'Create Bot & Manager'}
                </button>
            </form>
        </div>
    );
}
