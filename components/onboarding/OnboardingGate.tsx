'use client';

import React from 'react';
import OnboardingPanel from './OnboardingPanel';

import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { checkTradingAccount } from '@/lib/features/onboarding/check-account';
import { createTradingAccountTransaction } from '@/lib/features/deepbook/create-account';
import { fetchAccountBalances } from '@/lib/features/deepbook/balance';

export type OnboardingState =
    | 'DISCONNECTED'
    | 'FETCHING_ACCOUNT'
    | 'NO_TRADING_ACCOUNT'
    | 'ACCOUNT_READY_NO_FUNDS' // Keeping for backward compat if needed, but unused now
    | 'DEPOSIT'
    | 'READY';

export default function OnboardingGate() {
    // UI-only mock state (replace later with real wallet+chain state)
    const [state, setState] = React.useState<OnboardingState>('DISCONNECTED');
    const [managerId, setManagerId] = React.useState<string | null>(null);
    const [balances, setBalances] = React.useState<any[]>([]); // TODO: Type this properly
    const account = useCurrentAccount();
    const dAppKit = useDAppKit();
    const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

    React.useEffect(() => {
        if (account) {
            // If connected and state is DISCONNECTED, start checking
            if (state === 'DISCONNECTED') {
                setState('FETCHING_ACCOUNT');

                checkTradingAccount(account.address, network)
                    .then((result) => {
                        if (result.exists && result.accountIds && result.accountIds.length > 0) {
                            const id = result.accountIds[0];
                            setManagerId(id);

                            // User wants to see balances immediately (even if zero)
                            setState('READY');

                            // Start fetching balances immediately
                            fetchBalances(id);
                        } else {
                            setState('NO_TRADING_ACCOUNT');
                        }
                    })
                    .catch((err) => {
                        console.error("Failed to check account:", err);
                        setState('NO_TRADING_ACCOUNT'); // Fallback
                    });
            }
        } else {
            // If disconnected, force state to DISCONNECTED
            setState('DISCONNECTED');
            setManagerId(null);
            setBalances([]);
        }
    }, [account, state]); // Dependency 'network' effectively constant

    const fetchBalances = async (id: string) => {
        console.log(`Fetching balances for manager ${id}...`);
        try {
            const bals = await fetchAccountBalances(id, network);
            console.log("Balances fetched:", bals);
            setBalances(bals);
        } catch (e) {
            console.error("Failed to fetch balances:", e);
        }
    };

    // Re-fetch balances when entering READY state or periodically?
    // For now, let's expose a manual refresh or just fetch on mount.

    const handleCreateAccount = async () => {
        if (!account) return;

        try {
            console.log("Building creation transaction...");
            const tx = await createTradingAccountTransaction(account.address, network);

            console.log("Requesting signature...");
            const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

            console.log("Account creation successful:", result);
            // After creation, we need to find the new manager ID.
            // For now, let's just re-trigger the check flow or optimistically check.
            // Ideally transaction response events/changes would give us the ID.
            // Simple approach: Reset state to DISCONNECTED (connected) which triggers a re-check!
            setState('DISCONNECTED');
        } catch (e) {
            console.error("Account creation failed:", e);
            // TODO: Show error toast
        }
    };

    return (
        <OnboardingPanel
            state={state}
            onSetState={setState}
            onCreateAccount={handleCreateAccount}
            market="SUI–USDC"
            envLabel={account ? 'Connected' : (process.env.NEXT_PUBLIC_SUI_NETWORK || 'Testnet')}
            balances={balances}
            onRefreshBalances={() => managerId && fetchBalances(managerId)}
            managerId={managerId}
        />
    );
}
