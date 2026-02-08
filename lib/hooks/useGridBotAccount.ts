// lib/hooks/useGridBotAccount.ts
// Hook to manage Grid Bot account state (checking if account exists, creating, etc.)

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { checkTradingAccount } from '@/lib/features/onboarding/check-account';
import { createTradingAccountTransaction } from '@/lib/features/deepbook/create-account';
import { checkExistingTradeCap } from '@/lib/grid-bot/check-trade-cap';
import { buildDepositTransaction } from '@/lib/features/deepbook/deposit';
import { fetchAccountBalances, type BalanceResult } from '@/lib/features/deepbook/balance';

const LOG_PREFIX = '[useGridBotAccount]';

export type BotAccountStatus =
    | 'disconnected'
    | 'checking'
    | 'no_account'
    | 'has_account'
    | 'creating'
    | 'depositing'
    | 'error';

interface UseGridBotAccountReturn {
    status: BotAccountStatus;
    accountId: string | null;  // Balance Manager ID
    accountIds: string[];
    tradeCapId: string | null; // Selected TradeCap ID
    tradeCapIds: string[];
    error: string | null;
    isReady: boolean;          // True if we have both Balance Manager and TradeCap
    isDepositing: boolean;
    balances: BalanceResult[]; // Current balances in the Balance Manager

    // Actions
    checkAccount: () => Promise<void>;
    createAccount: () => Promise<void>;
    deposit: (amount: number, coinKey: string) => Promise<string | null>;
    refreshBalances: () => Promise<void>;
}

interface UseGridBotAccountOptions {
    /** If provided, use this manager ID directly instead of discovering from wallet */
    explicitManagerId?: string;
}

export function useGridBotAccount(options: UseGridBotAccountOptions = {}): UseGridBotAccountReturn {
    const { explicitManagerId } = options;
    const account = useCurrentAccount();
    const dAppKit = useDAppKit();

    const [status, setStatus] = useState<BotAccountStatus>('disconnected');
    const [accountId, setAccountId] = useState<string | null>(explicitManagerId ?? null);
    const [accountIds, setAccountIds] = useState<string[]>(explicitManagerId ? [explicitManagerId] : []);
    const [tradeCapId, setTradeCapId] = useState<string | null>(null);
    const [tradeCapIds, setTradeCapIds] = useState<string[]>([]);
    const [balances, setBalances] = useState<BalanceResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'mainnet';

    // Helper to fetch balances if accountId is set
    const fetchBalances = useCallback(async (managerId: string) => {
        try {
            // console.log(LOG_PREFIX, 'Fetching balances for manager:', managerId);
            const results = await fetchAccountBalances(managerId, network, account?.address);
            setBalances(results);
            // console.log(LOG_PREFIX, 'Balances updated:', results);
        } catch (err) {
            console.error(LOG_PREFIX, 'Error fetching balances:', err);
        }
    }, [network, account?.address]);

    // Check for existing account AND TradeCap
    const checkAccount = useCallback(async () => {
        // console.log(LOG_PREFIX, 'checkAccount called', { address: account?.address, network });

        if (!account?.address) {
            setStatus('disconnected');
            return;
        }

        setStatus('checking');
        setError(null);

        try {
            // 1. Check Balance Manager
            // If explicitManagerId is provided, use it directly
            let managerId: string | null = null;
            let discoveredIds: string[] = [];

            if (explicitManagerId) {
                managerId = explicitManagerId;
                discoveredIds = [explicitManagerId];
                console.log(LOG_PREFIX, 'Using explicit manager ID:', managerId);
            } else {
                const result = await checkTradingAccount(account.address, network);
                if (result.exists && result.accountIds?.length) {
                    managerId = result.accountIds[0];
                    discoveredIds = result.accountIds;
                }
            }

            if (managerId) {
                setAccountIds(discoveredIds);
                setAccountId(managerId);

                // 2. Check TradeCap for this manager
                // console.log(LOG_PREFIX, 'Checking TradeCap for manager:', managerId);
                const capResult = await checkExistingTradeCap(account.address, managerId, network);

                if (capResult.exists && capResult.tradeCapId) {
                    setTradeCapIds(capResult.tradeCapIds);
                    setTradeCapId(capResult.tradeCapId);
                    // console.log(LOG_PREFIX, 'Found TradeCap:', capResult.tradeCapId);
                } else {
                    setTradeCapIds([]);
                    setTradeCapId(null);
                }

                // 3. Fetch Balances
                await fetchBalances(managerId);

                setStatus('has_account');
            } else {
                setAccountIds([]);
                setAccountId(null);
                setTradeCapIds([]);
                setTradeCapId(null);
                setStatus('no_account');
            }
        } catch (err) {
            console.error(LOG_PREFIX, 'Error checking account:', err);
            setError(err instanceof Error ? err.message : 'Failed to check account');
            setStatus('error');
        }
    }, [account?.address, network, fetchBalances]);

    // Create new account using dAppKit (Sui 2.0 pattern)
    const createAccount = useCallback(async () => {
        if (!account?.address) return;

        setStatus('creating');
        setError(null);

        try {
            const tx = await createTradingAccountTransaction(account.address, network);

            const result = await dAppKit.signAndExecuteTransaction({
                transaction: tx,
            });

            if (result.$kind === 'FailedTransaction') {
                const errorStatus = result.FailedTransaction?.status?.error;
                const errorMsg = typeof errorStatus === 'string' ? errorStatus : 'Transaction failed';
                console.error(LOG_PREFIX, 'Transaction failed:', errorMsg);
                setError(errorMsg);
                setStatus('error');
                return;
            }

            // Re-check to get the new account ID
            await checkAccount();
        } catch (err) {
            console.error(LOG_PREFIX, 'Error creating account:', err);
            setError(err instanceof Error ? err.message : 'Failed to create account');
            setStatus('error');
        }
    }, [account?.address, network, dAppKit, checkAccount]);

    // Deposit funds into the Balance Manager
    const deposit = useCallback(async (amount: number, coinKey: string): Promise<string | null> => {
        if (!account?.address || !accountId) {
            setError('No active account to deposit into');
            return null;
        }

        const prevStatus = status;
        setStatus('depositing');
        setError(null);

        try {
            const tx = await buildDepositTransaction({
                walletAddress: account.address,
                managerId: accountId,
                coinKey,
                amount,
                network
            });

            const result = await dAppKit.signAndExecuteTransaction({
                transaction: tx,
            });

            if (result.$kind === 'FailedTransaction') {
                const errorStatus = result.FailedTransaction?.status?.error;
                const errorMsg = typeof errorStatus === 'string' ? errorStatus : 'Transaction failed';
                console.error(LOG_PREFIX, 'Deposit transaction failed:', errorMsg);
                setError(errorMsg);
                setStatus('error');
                return null;
            }

            // Wait a bit for chain to update, then refresh balances
            setTimeout(() => {
                fetchBalances(accountId);
            }, 2000);

            setStatus(prevStatus); // Restore previous status
            return result.Transaction?.digest ?? null;

        } catch (err) {
            console.error(LOG_PREFIX, 'Deposit error:', err);
            setError(err instanceof Error ? err.message : 'Deposit failed');
            setStatus('error');
            return null;
        }
    }, [account?.address, accountId, network, dAppKit, status, fetchBalances]);

    // Manual refresh
    const refreshBalances = useCallback(async () => {
        if (accountId) {
            await fetchBalances(accountId);
        }
    }, [accountId, fetchBalances]);

    // Auto-check when wallet connects
    useEffect(() => {
        if (account?.address) {
            checkAccount();
        } else {
            setStatus('disconnected');
            setAccountId(null);
            setAccountIds([]);
            setTradeCapId(null);
            setTradeCapIds([]);
            setBalances([]);
        }
    }, [account?.address, checkAccount]);

    return {
        status,
        accountId,
        accountIds,
        tradeCapId,
        tradeCapIds,
        balances,
        error,
        isReady: status === 'has_account' && !!accountId && !!tradeCapId,
        isDepositing: status === 'depositing',
        checkAccount,
        createAccount,
        deposit,
        refreshBalances,
    };
}
