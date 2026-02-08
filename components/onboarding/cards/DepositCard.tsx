'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import WithdrawCard from './WithdrawCard';
import { useGridBotAccount } from '@/lib/hooks/useGridBotAccount';
import { useWalletBalances } from '@/lib/hooks/useWalletBalances';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { buildDepositTransaction } from '@/lib/features/deepbook/deposit';

const ALL_ASSETS = ['SUI', 'USDC', 'DEEP', 'USDT', 'WETH'];

export default function DepositCard({
    managerId,
    onSuccess,
    onBack,
}: {
    managerId?: string | null;
    onSuccess: () => void;
    onBack: () => void;
}) {
    const [mode, setMode] = React.useState<'deposit' | 'withdraw'>('deposit');
    const { data: walletBalances, isLoading } = useWalletBalances(); // For deposits (Wallet -> Manager)
    const botAccount = useGridBotAccount({ explicitManagerId: managerId || undefined }); // For withdrawals (Manager -> Wallet)

    // For withdrawal, we use bot balances
    const managerBalances = botAccount.balances;

    const account = useCurrentAccount();
    const dAppKit = useDAppKit();

    const [asset, setAsset] = React.useState<string>('SUI');
    const [amount, setAmount] = React.useState<string>('');
    const [isDepositing, setIsDepositing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

    // Toggle UI
    const toggleUI = (
        <div className="flex justify-center mb-6">
            <div className="bg-[#0b0f14] p-1 rounded-lg flex border border-white/5">
                <button
                    onClick={() => setMode('deposit')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'deposit'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Deposit
                </button>
                <button
                    onClick={() => setMode('withdraw')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'withdraw'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Withdraw
                </button>
            </div>
        </div>
    );

    // Render Withdraw Card if mode is withdraw
    if (mode === 'withdraw' && managerId) {
        return (
            <div>
                {toggleUI}
                <WithdrawCard
                    managerId={managerId}
                    availableBalances={managerBalances}
                    onSuccess={onSuccess}
                    onBack={onBack}
                />
            </div>
        );
    }

    // Find balance for selected asset (Wallet Balance for Deposit)
    const selectedBalance = walletBalances?.find(b => b.coinKey === asset);
    const available = selectedBalance?.availableBalance || 0;

    const handleMax = () => {
        setAmount(available.toString());
    };

    const handlePercentage = (percent: number) => {
        const val = available * percent;
        setAmount(val.toString());
    };

    const handleDeposit = async () => {
        if (!account || !managerId || !amount || Number(amount) <= 0) {
            setError('Invalid deposit parameters');
            return;
        }

        setIsDepositing(true);
        setError(null);

        try {
            console.log(`[DepositCard] Building deposit transaction...`);
            console.log(`  Wallet: ${account.address}`);
            console.log(`  Manager: ${managerId}`);
            console.log(`  Asset: ${asset}`);
            console.log(`  Amount: ${amount}`);

            const tx = await buildDepositTransaction({
                walletAddress: account.address,
                managerId,
                coinKey: asset,
                amount: parseFloat(amount),
                network: network as any, // Cast to avoid type mismatch
            });

            console.log(`[DepositCard] Requesting wallet signature...`);
            const result = await dAppKit.signAndExecuteTransaction({
                transaction: tx,
            });

            console.log(`[DepositCard] Deposit successful:`, result);

            // Success! Call the callback
            onSuccess();
        } catch (e: any) {
            console.error('[DepositCard] Deposit failed:', e);
            setError(e.message || 'Deposit failed');
        } finally {
            setIsDepositing(false);
        }
    };

    const canDeposit =
        !!account &&
        !!managerId &&
        !!amount &&
        Number(amount) > 0 &&
        Number(amount) <= available &&
        !isDepositing;

    return (
        <div className="rounded-lg border border-white/5 bg-black/20 p-4">
            {managerId && toggleUI}
            <div className="text-sm font-semibold text-zinc-100 mb-2">Deposit Funds</div>
            <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
                Move funds from your wallet into the trading account.
            </p>

            {error && (
                <div className="mt-3 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300">
                    {error}
                </div>
            )}

            <div className="mt-6 space-y-4">
                {/* Asset Selection */}
                <div>
                    <div className="flex justify-between mb-1.5">
                        <label className="text-xs text-zinc-400">Asset</label>
                        <div className="text-[10px] text-zinc-500">
                            Available: <span className="text-zinc-300 font-mono">{isLoading ? '...' : available.toLocaleString(undefined, { maximumFractionDigits: 6 })} {asset}</span>
                        </div>
                    </div>

                    <div className="relative">
                        <select
                            value={asset}
                            onChange={(e) => setAsset(e.target.value)}
                            className="w-full appearance-none rounded-md border border-white/10 bg-white/5 py-2.5 pl-3 pr-8 text-sm text-zinc-200 outline-none focus:border-white/20 transition-all cursor-pointer hover:bg-white/10"
                        >
                            {ALL_ASSETS.map((t) => {
                                const bal = walletBalances?.find(b => b.coinKey === t);
                                return (
                                    <option key={t} value={t} className="bg-zinc-900 text-zinc-200">
                                        {t} {bal ? `(${bal.availableBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })})` : ''}
                                    </option>
                                );
                            })}
                        </select>
                        {/* Chevron Icon */}
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Amount Input */}
                <div>
                    <div className="mb-1.5 flex justify-between items-center">
                        <label className="text-xs text-zinc-400">Amount</label>
                        <button
                            onClick={handleMax}
                            className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded border border-white/5 transition-colors"
                        >
                            Max
                        </button>
                    </div>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={`0.00`}
                        className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-white/20 transition-all font-mono"
                    />

                    {/* Percentage Shortcuts */}
                    <div className="mt-2 grid grid-cols-4 gap-2">
                        {[0.25, 0.50, 0.75, 1].map((p) => (
                            <button
                                key={p}
                                onClick={() => handlePercentage(p)}
                                className="rounded-md bg-white/5 py-1.5 text-[10px] text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition-colors border border-transparent hover:border-white/5"
                            >
                                {p * 100}%
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-5 rounded-lg border border-white/5 bg-white/5 p-3">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-zinc-300">Preview</span>
                </div>
                <div className="space-y-1.5 text-xs text-zinc-400">
                    <Row k="From" v="Wallet" />
                    <Row k="To" v="Trading account" />
                    <Row k="Amount" v={amount ? `${amount} ${asset}` : '—'} />
                    <Row k="Est. time" v="~1s" />
                </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-white/5">
                <button
                    onClick={onBack}
                    disabled={isDepositing}
                    className="rounded-md bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                    Back
                </button>

                <button
                    onClick={handleDeposit}
                    disabled={!canDeposit}
                    className={cn(
                        "rounded-md px-4 py-2 text-sm font-semibold transition-all border",
                        !canDeposit
                            ? "bg-white/5 text-zinc-500 border-white/5 cursor-not-allowed"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30"
                    )}
                >
                    {isDepositing ? 'Depositing...' : `Deposit ${amount ? `${amount} ${asset}` : ''}`}
                </button>
            </div>
        </div>
    );
}

function Row({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">{k}</span>
            <span className="text-zinc-200">{v}</span>
        </div>
    );
}
