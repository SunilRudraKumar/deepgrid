import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import { testnetCoins, mainnetCoins } from '@mysten/deepbook-v3';

export interface WalletBalance {
    coinKey: string;
    coinType: string;
    totalBalance: number;
    lockedBalance: number;
    availableBalance: number;
}

export function useWalletBalances() {
    const account = useCurrentAccount();
    const client = useCurrentClient();

    // Get network from env (dAppKit uses same env in its config)
    const network = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'mainnet' | 'testnet';

    // Map for converting coinType -> coinKey (e.g. 0x...::sui::SUI -> SUI)
    const coinsMap = network === 'mainnet' ? mainnetCoins : testnetCoins;
    const typeToKey = Object.entries(coinsMap).reduce((acc, [key, val]) => {
        acc[val.type] = key;
        return acc;
    }, {} as Record<string, string>);

    return useQuery({
        queryKey: ['wallet-balances', account?.address, network],
        enabled: !!account && !!client,
        queryFn: async () => {
            if (!account || !client) return [];

            // Debug: console.log(`[Balances] Fetching for ${account.address}...`);

            try {
                console.log(`\n💰 [WalletBalances] Fetching for ${account.address} on ${network}...`);

                const { balances } = await client.core.listBalances({
                    owner: account.address
                });



                const parsedBalances: WalletBalance[] = balances.map((bal: any) => {
                    const coinKey = typeToKey[bal.coinType] || 'UNKNOWN';
                    const coinDef = coinsMap[coinKey];

                    // If unknown, default to 9 decimals (SUI standard)
                    const scalar = coinDef ? coinDef.scalar : 1_000_000_000;

                    // The RPC returns 'balance' or 'coinBalance', not 'totalBalance'
                    const rawBalance = bal.balance || bal.coinBalance || bal.totalBalance || '0';
                    const total = BigInt(rawBalance);
                    const adjusted = Number(total) / scalar;

                    return {
                        coinKey,
                        coinType: bal.coinType,
                        totalBalance: adjusted,
                        lockedBalance: 0,
                        availableBalance: adjusted,
                    };
                });



                // Log clear summary of wallet balances
                console.log(`💰 [WalletBalances] Found ${parsedBalances.length} tokens:`);
                parsedBalances.forEach(b => {
                    if (b.coinKey !== 'UNKNOWN') {
                        console.log(`   ${b.coinKey}: ${b.totalBalance.toFixed(4)}`);
                    }
                });

                // Filter to supported coins only
                return parsedBalances.filter(b => b.coinKey !== 'UNKNOWN');

            } catch (e) {
                console.error("[useWalletBalances] Failed to fetch wallet balances:", e);
                return [];
            }
        },
        refetchInterval: 10000,
    });
}
