'use client';

import React from 'react';
import { Panel } from '@/components/terminal/ui/Panel';
import CreateAccountCard from './cards/CreateAccountCard';
import DepositCard from './cards/DepositCard';
import ReadyCard from './cards/ReadyCard';
import LoadingCard from './cards/LoadingCard';
import type { OnboardingState } from './OnboardingGate';

export default function OnboardingPanel({
    state,
    onSetState,
    onCreateAccount,
    market,
    envLabel,
    balances,
    onRefreshBalances,
    managerId,
}: {
    state: OnboardingState;
    onSetState: (s: OnboardingState) => void;
    onCreateAccount?: () => void;
    market: string;
    envLabel: string;
    balances?: any[]; // TODO: Import BalanceResult type
    onRefreshBalances?: () => void;
    managerId?: string | null;
}) {
    const stepIndex =
        state === 'DISCONNECTED' ? 0 :
            state === 'NO_TRADING_ACCOUNT' ? 1 :
                state === 'DEPOSIT' ? 2 : // Deposit is a step above Ready? Or purely modal.
                    3; // Ready

    return (
        <Panel
            title={
                <div className="flex items-center gap-3">
                    <span className="text-zinc-100">{market}</span>
                    <span className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-zinc-300 border border-white/5">
                        {envLabel}
                    </span>
                    <span className="text-xs text-zinc-500">Onboarding</span>
                </div>
            }
        >
            <div className="h-full min-h-0 p-4 overflow-y-auto">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-100">Trading Account Setup</h2>
                        <p className="mt-1 text-sm text-zinc-400">
                            Create your trading account, fund it, and confirm balances before placing orders.
                        </p>
                    </div>

                    <StatusPill state={state} />
                </div>

                <div className="mt-8 max-w-2xl mx-auto">
                    {/* Main step card */}
                    <div className="min-h-0">
                        {state === 'DISCONNECTED' && (
                            <CreateAccountCard
                                mode="disconnected"
                                onPrimary={() => onSetState('NO_TRADING_ACCOUNT')}
                            />
                        )}

                        {state === 'NO_TRADING_ACCOUNT' && (
                            <CreateAccountCard
                                mode="create"
                                onPrimary={() => {
                                    if (onCreateAccount) onCreateAccount();
                                    else onSetState('READY');
                                }}
                            />
                        )}

                        {state === 'FETCHING_ACCOUNT' && (
                            <LoadingCard message="Checking account status..." />
                        )}

                        {(state === 'ACCOUNT_READY_NO_FUNDS' || state === 'DEPOSIT') && (
                            <DepositCard
                                managerId={managerId}
                                onSuccess={() => {
                                    onSetState('READY');
                                    if (onRefreshBalances) onRefreshBalances();
                                }}
                                onBack={() => onSetState('READY')}
                            />
                        )}

                        {state === 'READY' && (
                            <ReadyCard
                                onReset={() => onSetState('NO_TRADING_ACCOUNT')}
                                balances={balances}
                                onRefresh={onRefreshBalances}
                                onDeposit={() => onSetState('DEPOSIT')}
                            />
                        )}
                    </div>
                </div>
            </div>
        </Panel>
    );
}

function StatusPill({ state }: { state: OnboardingState }) {
    const map: Record<OnboardingState, { label: string; cls: string }> = {
        DISCONNECTED: { label: 'Not connected', cls: 'bg-white/5 text-zinc-300 border-white/10' },
        FETCHING_ACCOUNT: { label: 'Checking...', cls: 'bg-blue-500/15 text-blue-200 border-blue-500/20' },
        NO_TRADING_ACCOUNT: { label: 'Account required', cls: 'bg-amber-500/15 text-amber-200 border-amber-500/20' },
        ACCOUNT_READY_NO_FUNDS: { label: 'Funding required', cls: 'bg-sky-500/15 text-sky-200 border-sky-500/20' },
        DEPOSIT: { label: 'Depositing...', cls: 'bg-purple-500/15 text-purple-200 border-purple-500/20' },
        READY: { label: 'Ready', cls: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/20' },
    };

    return (
        <div className={`rounded-md px-3 py-2 text-xs border ${map[state].cls}`}>
            {map[state].label}
        </div>
    );
}


function SecurityCallout() {
    return (
        <div className="rounded-lg border border-white/5 bg-black/20 p-3 max-w-sm mx-auto mt-6">
            <div className="text-xs font-medium text-zinc-200 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                Safety
            </div>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                Your private keys never touch this UI. Transactions should be signed by the wallet only.
            </p>
        </div>
    );
}
