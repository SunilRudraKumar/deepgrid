// lib/hooks/useMintTradeCap.ts
// Hook for minting TradeCap and checking existing TradeCaps

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDAppKit, useCurrentAccount } from '@mysten/dapp-kit-react';
import {
    buildMintTradeCapTransaction,
    findTradeCapFromResult,
    findTradeCapFromDigest
} from '@/lib/grid-bot/trade-cap';
import { checkExistingTradeCap } from '@/lib/grid-bot/check-trade-cap';

const LOG_PREFIX = '[useMintTradeCap]';

type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

export type MintStatus = 'idle' | 'checking' | 'building' | 'signing' | 'confirming' | 'success' | 'error';

interface UseMintTradeCapReturn {
    status: MintStatus;
    tradeCapId: string | null;
    tradeCapIds: string[];
    error: string | null;
    digest: string | null;
    isChecking: boolean;
    hasTradeCap: boolean;
    mintTradeCap: (balanceManagerId: string) => Promise<string | null>;
    checkTradeCaps: () => Promise<void>;
    reset: () => void;
}

export function useMintTradeCap(): UseMintTradeCapReturn {
    const account = useCurrentAccount();
    const dAppKit = useDAppKit();

    const [status, setStatus] = useState<MintStatus>('idle');
    const [tradeCapId, setTradeCapId] = useState<string | null>(null);
    const [tradeCapIds, setTradeCapIds] = useState<string[]>([]);
    const [digest, setDigest] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const network = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'mainnet') as Network;

    // Check for existing TradeCaps
    const checkTradeCaps = useCallback(async (balanceManagerId?: string) => {
        if (!account?.address) {
            console.log(LOG_PREFIX, 'No wallet connected, skipping TradeCap check');
            return;
        }

        console.log(LOG_PREFIX, 'Checking for existing TradeCaps...', balanceManagerId ? `for manager ${balanceManagerId}` : '');
        setStatus('checking');

        try {
            const result = await checkExistingTradeCap(account.address, balanceManagerId, network);
            console.log(LOG_PREFIX, 'TradeCap check result:', result);

            if (result.exists && result.tradeCapId) {
                setTradeCapId(result.tradeCapId);
                setTradeCapIds(result.tradeCapIds);
                setStatus('success');
                console.log(LOG_PREFIX, 'Found existing TradeCap:', result.tradeCapId);
            } else {
                setStatus('idle');
                console.log(LOG_PREFIX, 'No existing TradeCaps found');
            }
        } catch (err) {
            console.error(LOG_PREFIX, 'Error checking TradeCaps:', err);
            setStatus('idle');
        }
    }, [account?.address, network]);

    // Auto-check for TradeCaps when wallet connects
    useEffect(() => {
        if (account?.address) {
            checkTradeCaps();
        } else {
            // Reset when wallet disconnects
            setTradeCapId(null);
            setTradeCapIds([]);
            setStatus('idle');
        }
    }, [account?.address, checkTradeCaps]);

    const mintTradeCap = useCallback(async (balanceManagerId: string): Promise<string | null> => {
        console.log(LOG_PREFIX, 'mintTradeCap called', {
            address: account?.address?.slice(0, 16) + '...',
            balanceManagerId: balanceManagerId.slice(0, 16) + '...',
            network
        });

        if (!account?.address) {
            console.log(LOG_PREFIX, 'No wallet connected');
            setError('Wallet not connected');
            setStatus('error');
            return null;
        }

        setStatus('building');
        setError(null);
        setDigest(null);

        try {
            const managerKey = 'GRID_BOT';

            console.log(LOG_PREFIX, 'Building TradeCap transaction...');
            const tx = await buildMintTradeCapTransaction(
                account.address,
                balanceManagerId,
                managerKey,
                network
            );

            setStatus('signing');
            console.log(LOG_PREFIX, 'Requesting signature from wallet...');

            const result = await dAppKit.signAndExecuteTransaction({
                transaction: tx,
            });

            console.log(LOG_PREFIX, 'Transaction result:', result);

            // Check discriminated union - handle success vs failure
            if (result.$kind === 'FailedTransaction') {
                const errorStatus = result.FailedTransaction?.status?.error;
                const errorMsg = typeof errorStatus === 'string' ? errorStatus : 'Transaction failed';
                console.error(LOG_PREFIX, 'Transaction failed:', errorMsg);
                setError(errorMsg);
                setStatus('error');
                return null;
            }

            // Success case
            const txDigest = result.Transaction?.digest;
            console.log(LOG_PREFIX, 'Transaction executed successfully:', txDigest);
            setDigest(txDigest ?? null);
            setStatus('confirming');

            // Try to find TradeCap from result
            let capId = findTradeCapFromResult(result.Transaction);

            // Fallback: Query the transaction from chain
            if (!capId && txDigest) {
                console.log(LOG_PREFIX, 'TradeCap not in result, querying chain...');
                capId = await findTradeCapFromDigest(txDigest, network);
            }

            if (capId) {
                console.log(LOG_PREFIX, 'TradeCap minted successfully:', capId);
                setTradeCapId(capId);
                setTradeCapIds(prev => [capId!, ...prev]);
                setStatus('success');
                return capId;
            } else {
                console.error(LOG_PREFIX, 'Transaction succeeded but TradeCap not found');
                setError('TradeCap created but could not identify object ID. Digest: ' + txDigest);
                setStatus('error');
                return null;
            }
        } catch (err) {
            console.error(LOG_PREFIX, 'Error minting TradeCap:', err);
            setError(err instanceof Error ? err.message : 'Failed to mint TradeCap');
            setStatus('error');
            return null;
        }
    }, [account?.address, network, dAppKit]);

    const reset = useCallback(() => {
        console.log(LOG_PREFIX, 'Resetting state');
        setStatus('idle');
        setTradeCapId(null);
        setTradeCapIds([]);
        setDigest(null);
        setError(null);
    }, []);

    return {
        status,
        tradeCapId,
        tradeCapIds,
        error,
        digest,
        isChecking: status === 'checking',
        hasTradeCap: !!tradeCapId,
        mintTradeCap,
        checkTradeCaps,
        reset,
    };
}
