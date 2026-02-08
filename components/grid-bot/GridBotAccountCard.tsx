// components/grid-bot/GridBotAccountCard.tsx
// Shows grid bot status: Connect → Grid Bot Account (Balance Manager) → Ready to Trade

'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import type { useGridBotAccount } from '@/lib/hooks/useGridBotAccount';
import type { MintStatus } from '@/lib/hooks/useMintTradeCap';
import { cn } from '@/lib/utils';
import FundManagerDialog from './FundManagerDialog';

const ConnectButton = dynamic(
    () => import('@mysten/dapp-kit-react').then((m) => m.ConnectButton),
    { ssr: false }
);

interface GridBotAccountCardProps {
    botAccount: ReturnType<typeof useGridBotAccount>;
    mintStatus?: MintStatus;
    onMintTradeCap?: () => void;
}

export default function GridBotAccountCard({
    botAccount,
    mintStatus = 'idle',
    onMintTradeCap,
}: GridBotAccountCardProps) {
    const account = useCurrentAccount();
    const [isFundDialogOpen, setIsFundDialogOpen] = useState(false);

    // Step 1: Not connected
    if (!account) {
        return (
            <SetupCard
                step={1}
                totalSteps={3}
                title="Connect Wallet"
                description="Connect your wallet to manage your Grid Bot"
                icon={<WalletIcon />}
                status="action"
            >
                <ConnectButton />
            </SetupCard>
        );
    }

    // Checking account
    if (botAccount.status === 'checking') {
        return (
            <SetupCard
                step={1}
                totalSteps={3}
                title="Checking Account"
                description="Verifying your Grid Bot account..."
                icon={<SpinnerIcon />}
                status="loading"
            />
        );
    }

    // No Grid Bot Account - need to create first
    if (botAccount.status === 'no_account') {
        return (
            <SetupCard
                step={2}
                totalSteps={3}
                title="Create Grid Bot Account"
                description="Initialize your Grid Bot trading account"
                icon={<AccountIcon />}
                status="action"
            >
                <button
                    onClick={() => botAccount.createAccount()}
                    className="px-4 py-2 rounded text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                >
                    Create Account
                </button>
            </SetupCard>
        );
    }

    // Creating account
    if (botAccount.status === 'creating') {
        return (
            <SetupCard
                step={2}
                totalSteps={3}
                title="Creating Account"
                description="Please confirm the transaction in your wallet..."
                icon={<SpinnerIcon />}
                status="loading"
            />
        );
    }

    // Error state
    if (botAccount.status === 'error') {
        return (
            <SetupCard
                step={2}
                totalSteps={3}
                title="Error"
                description={botAccount.error || 'Something went wrong'}
                icon={<ErrorIcon />}
                status="error"
            >
                <button
                    onClick={() => botAccount.checkAccount()}
                    className="px-4 py-2 rounded text-sm font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                    Retry
                </button>
            </SetupCard>
        );
    }

    // Ready state: Has TradeCap + Account. Show Balances.
    if (botAccount.tradeCapId) {
        return (
            <>
                <SetupCard
                    step={3}
                    totalSteps={3}
                    title="Grid Bot Ready"
                    description="Your bot is funded and ready to trade."
                    icon={<CheckIcon />}
                    status="success"
                    extra={
                        <div className="space-y-2 mt-2">
                            {/* Balances Section */}
                            <div className="flex gap-3 text-xs">
                                {botAccount.balances.length > 0 ? (
                                    botAccount.balances.map((b) => (
                                        <div key={b.coinKey} className="bg-white/5 px-2 py-1 rounded border border-white/5">
                                            <span className="text-white/70 font-medium">{b.balance.toFixed(4)}</span>
                                            <span className="text-white/40 ml-1">{b.coinKey}</span>
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-white/30 italic">No funds</span>
                                )}
                            </div>

                            {/* IDs (subtle) */}
                            <div className="text-[10px] text-white/20 font-mono truncate">
                                ID: {botAccount.accountId?.slice(0, 8)}...{botAccount.accountId?.slice(-4)}
                            </div>
                        </div>
                    }
                >
                    <div className="flex gap-2">
                        <button
                            onClick={() => botAccount.refreshBalances()}
                            className="p-2 rounded text-sm font-medium bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
                            title="Refresh Balances"
                        >
                            <RefreshIcon />
                        </button>
                        <button
                            onClick={() => setIsFundDialogOpen(true)}
                            className="px-4 py-2 rounded text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                        >
                            Fund Bot
                        </button>
                    </div>
                </SetupCard>

                <FundManagerDialog
                    isOpen={isFundDialogOpen}
                    onClose={() => setIsFundDialogOpen(false)}
                    onDeposit={botAccount.deposit}
                    balanceManagerId={botAccount.accountId}
                />
            </>
        );
    }

    // Minting TradeCap in progress
    if (mintStatus === 'building' || mintStatus === 'signing' || mintStatus === 'confirming') {
        // ... unchanged logic for minting status ...
        const statusText = {
            building: 'Building transaction...',
            signing: 'Please confirm in your wallet...',
            confirming: 'Confirming on chain...',
            idle: 'Preparing...',
            checking: 'Checking...',
            success: 'Success!',
            error: 'Error'
        }[mintStatus] || 'Processing...';

        return (
            <SetupCard
                step={2}
                totalSteps={3}
                title="Minting TradeCap"
                description={statusText}
                icon={<SpinnerIcon />}
                status="loading"
            />
        );
    }

    // Has Account, needs TradeCap
    return (
        <SetupCard
            step={2}
            totalSteps={3}
            title="Authorize Grid Bot"
            description="Mint a TradeCap to allow the bot to place orders."
            icon={<BotIcon />}
            status="action"
            extra={
                <p className="text-[10px] text-white/30 font-mono truncate mt-1">
                    Account: {botAccount.accountId?.slice(0, 8)}...
                </p>
            }
        >
            <button
                onClick={onMintTradeCap}
                className="px-4 py-2 rounded text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
                Mint TradeCap
            </button>
        </SetupCard>
    );
}

// --- Sub-components (unchanged except for added RefreshIcon) ---

function SetupCard({
    step,
    totalSteps,
    title,
    description,
    icon,
    status,
    extra,
    children,
}: {
    step: number;
    totalSteps: number;
    title: string;
    description: string;
    icon: React.ReactNode;
    status: 'action' | 'loading' | 'success' | 'error';
    extra?: React.ReactNode;
    children?: React.ReactNode;
}) {
    const borderColors = {
        action: 'border-white/10',
        loading: 'border-blue-500/30',
        success: 'border-emerald-500/30',
        error: 'border-red-500/30',
    };

    const bgColors = {
        action: 'bg-[#0f141b]',
        loading: 'bg-blue-500/5',
        success: 'bg-emerald-500/5',
        error: 'bg-red-500/5',
    };

    return (
        <div className={cn(
            'rounded-lg border p-4',
            borderColors[status],
            bgColors[status]
        )}>
            <div className="flex items-start gap-3">
                <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    status === 'success' ? 'bg-emerald-500/20' :
                        status === 'error' ? 'bg-red-500/20' :
                            status === 'loading' ? 'bg-blue-500/20' :
                                'bg-white/10'
                )}>
                    {icon}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] text-white/30 uppercase tracking-wider">
                            Step {step} of {totalSteps}
                        </span>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-0.5">{title}</h3>
                    <p className="text-xs text-white/50">{description}</p>
                    {extra}
                </div>

                {children && (
                    <div className="shrink-0">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}

// ... existing icons ...

function WalletIcon() {
    return (
        <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
        </svg>
    );
}

function AccountIcon() {
    return (
        <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
    );
}

function BotIcon() {
    return (
        <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5l1.45 1.45a2.25 2.25 0 010 3.182l-.75.75a2.25 2.25 0 01-3.182 0L5 7.5m14.8 7l-1.45-1.45m0 0L12 6.75M4.2 14.5l-1.45 1.45a2.25 2.25 0 000 3.182l.75.75a2.25 2.25 0 003.182 0L19 7.5M4.2 14.5l1.45-1.45" />
        </svg>
    );
}

function SpinnerIcon() {
    return (
        <div className="w-4 h-4 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
    );
}

function CheckIcon() {
    return (
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    );
}

function ErrorIcon() {
    return (
        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function RefreshIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
    );
}
