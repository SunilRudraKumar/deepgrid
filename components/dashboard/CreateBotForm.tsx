'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { createTradingAccountTransaction } from '@/lib/features/deepbook/create-account';
import { checkTradingAccount } from '@/lib/features/onboarding/check-account';
import { registerBot } from '@/lib/actions/bot-actions';

interface CreateBotFormProps {
    defaultType?: 'GRID' | 'DCA';
}

export function CreateBotForm({ defaultType = 'GRID' }: CreateBotFormProps) {
    const router = useRouter();
    const account = useCurrentAccount();
    const dAppKit = useDAppKit();

    const [name, setName] = React.useState('');
    const [type, setType] = React.useState<'GRID' | 'DCA'>(defaultType);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [status, setStatus] = React.useState('');

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
            // 1. Get existing manager IDs before creation
            setStatus('Checking existing accounts...');
            const beforeCheck = await checkTradingAccount(account.address, 'mainnet');
            const existingIds = beforeCheck.accountIds || [];
            console.log('[CreateBot] Existing manager IDs:', existingIds);

            // 2. Prepare & Execute Transaction
            setStatus('Creating BalanceManager on-chain...');
            const tx = await createTradingAccountTransaction(account.address, 'mainnet');

            const result = await dAppKit.signAndExecuteTransaction({
                transaction: tx,
            });

            // Check for failed transaction
            if (result.$kind === 'FailedTransaction') {
                const errorStatus = result.FailedTransaction?.status?.error;
                const errorMsg = typeof errorStatus === 'string' ? errorStatus : 'Transaction failed';
                throw new Error(errorMsg);
            }

            console.log('[CreateBot] Transaction succeeded');

            // 3. Wait for indexer to pick up the new object
            setStatus('Waiting for chain indexer...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 4. Re-check to find the new manager ID
            setStatus('Finding new BalanceManager...');
            const afterCheck = await checkTradingAccount(account.address, 'mainnet');
            const newIds = afterCheck.accountIds || [];
            console.log('[CreateBot] New manager IDs:', newIds);

            // Find the new ID (one that wasn't in existingIds)
            const newManagerId = newIds.find(id => !existingIds.includes(id));

            if (!newManagerId) {
                // Fallback: just use the last one if we can't find the new one
                const fallbackId = newIds[newIds.length - 1];
                if (fallbackId) {
                    console.log('[CreateBot] Using fallback manager ID:', fallbackId);
                    await saveBot(fallbackId);
                } else {
                    throw new Error('Could not find the newly created BalanceManager');
                }
            } else {
                console.log('[CreateBot] Found new manager ID:', newManagerId);
                await saveBot(newManagerId);
            }

        } catch (err: any) {
            console.error('[CreateBot] Error:', err);
            setError(err.message || 'An error occurred');
            setIsLoading(false);
            setStatus('');
        }
    };

    const saveBot = async (balanceManagerId: string) => {
        if (!account?.address) return;

        setStatus('Registering bot in database...');

        // 5. Register in database
        const bot = await registerBot({
            ownerAddress: account.address,
            name,
            type,
            balanceManagerId,
            network: 'mainnet'
        });

        console.log('[CreateBot] Bot registered:', bot);
        setStatus('Success!');

        // Redirect to bot page or dashboard
        router.push('/dashboard');
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

                {status && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        {status}
                    </div>
                )}

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
                    {isLoading ? 'Creating...' : 'Create Bot & Manager'}
                </button>
            </form>
        </div>
    );
}
