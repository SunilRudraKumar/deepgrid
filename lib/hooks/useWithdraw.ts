import { useCallback, useState } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { deepbook } from '@mysten/deepbook-v3';
import { type DeepbookNetwork } from '@/lib/deepbook/indexer';

const LOG_PREFIX = '[useWithdraw]';

const GRPC_URLS: Record<DeepbookNetwork, string> = {
    mainnet: 'https://fullnode.mainnet.sui.io:443',
    testnet: 'https://fullnode.testnet.sui.io:443',
};

export interface UseWithdrawResult {
    withdraw: (managerId: string, coinKey: string, amount: number) => Promise<string | null>;
    withdrawAll: (managerId: string, coinKey: string) => Promise<string | null>;
    status: 'idle' | 'building' | 'signing' | 'confirming' | 'success' | 'error';
    error: string | null;
    reset: () => void;
}

export function useWithdraw(): UseWithdrawResult {
    const account = useCurrentAccount();
    const dAppKit = useDAppKit();
    const [status, setStatus] = useState<UseWithdrawResult['status']>('idle');
    const [error, setError] = useState<string | null>(null);

    const network = (process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'mainnet') as DeepbookNetwork;

    // Reset status
    const reset = useCallback(() => {
        setStatus('idle');
        setError(null);
    }, []);

    // Withdraw specific amount
    const withdraw = useCallback(async (managerId: string, coinKey: string, amount: number): Promise<string | null> => {
        if (!account?.address) {
            setError('Wallet not connected');
            return null;
        }

        setStatus('building');
        setError(null);

        try {
            console.log(LOG_PREFIX, `Withdrawing ${amount} ${coinKey} from ${managerId}`);

            const tx = new Transaction();
            const baseUrl = GRPC_URLS[network];

            // Initialize DeepBook client
            const deepbookClient = new SuiGrpcClient({
                network,
                baseUrl
            }).$extend(deepbook({
                address: account.address,
                balanceManagers: {
                    'MANAGER': { address: managerId }
                },
                // We need to define coins to use coin keys like 'SUI', 'USDC'
                // Ideally this should come from a central config, but for now we map common ones
                coins: {
                    'SUI': {
                        address: '0x2::sui::SUI',
                        type: '0x2::sui::SUI',
                        scalar: 1_000_000_000
                    },
                    'USDC': {
                        address: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
                        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
                        scalar: 1_000_000
                    },
                    'DEEP': {
                        address: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a62f70478c1b309e3::deep::DEEP',
                        type: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a62f70478c1b309e3::deep::DEEP',
                        scalar: 1_000_000
                    },
                }
            }));

            // Calculate scalar based on coin decimals
            // TODO: Fetch decimals dynamically. For now assuming:
            // SUI: 9, USDC: 6, DEEP: 6
            let decimals = 9;
            if (coinKey === 'USDC' || coinKey === 'DEEP') decimals = 6;

            const amountScalar = amount * Math.pow(10, decimals);

            // Add withdraw command
            tx.add(
                deepbookClient.deepbook.balanceManager.withdrawFromManager(
                    'MANAGER',
                    coinKey,
                    Number(amountScalar),
                    account.address
                )
            );

            setStatus('signing');
            const result = await dAppKit.signAndExecuteTransaction({
                transaction: tx,
            });

            console.log(LOG_PREFIX, 'Withdraw success:', result);
            setStatus('success');
            return (result as any).digest || (result.Transaction as any)?.digest || 'submitted';

        } catch (err: any) {
            console.error(LOG_PREFIX, 'Withdraw failed:', err);
            setError(err.message || 'Withdrawal failed');
            setStatus('error');
            return null;
        }
    }, [account?.address, network, dAppKit]);

    // Withdraw all funds of a coin type
    const withdrawAll = useCallback(async (managerId: string, coinKey: string): Promise<string | null> => {
        if (!account?.address) {
            setError('Wallet not connected');
            return null;
        }

        setStatus('building');
        setError(null);

        try {
            console.log(LOG_PREFIX, `Withdrawing ALL ${coinKey} from ${managerId}`);

            const tx = new Transaction();
            const baseUrl = GRPC_URLS[network];

            const deepbookClient = new SuiGrpcClient({
                network,
                baseUrl
            }).$extend(deepbook({
                address: account.address,
                balanceManagers: {
                    'MANAGER': { address: managerId }
                },
                coins: {
                    'SUI': {
                        address: '0x2::sui::SUI',
                        type: '0x2::sui::SUI',
                        scalar: 1_000_000_000
                    },
                    'USDC': {
                        address: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
                        type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
                        scalar: 1_000_000
                    },
                    'DEEP': {
                        address: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a62f70478c1b309e3::deep::DEEP',
                        type: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a62f70478c1b309e3::deep::DEEP',
                        scalar: 1_000_000
                    },
                }
            }));

            tx.add(
                deepbookClient.deepbook.balanceManager.withdrawAllFromManager(
                    'MANAGER',
                    coinKey,
                    account.address
                )
            );

            setStatus('signing');
            const result = await dAppKit.signAndExecuteTransaction({
                transaction: tx,
            });

            console.log(LOG_PREFIX, 'Withdraw all success:', result);
            setStatus('success');
            return (result as any).digest || (result.Transaction as any)?.digest || 'submitted';

        } catch (err: any) {
            console.error(LOG_PREFIX, 'Withdraw failed:', err);
            setError(err.message || 'Withdrawal failed');
            setStatus('error');
            return null;
        }
    }, [account?.address, network, dAppKit]);

    return {
        withdraw,
        withdrawAll,
        status,
        error,
        reset
    };
}
