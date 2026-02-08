import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { deepbook } from "@mysten/deepbook-v3";
import {
    useCurrentAccount,
    useCurrentClient,
    useCurrentNetwork,
} from "@mysten/dapp-kit-react";

const MANAGER_KEY = "MANAGER";

function lsKey(network: string, address: string) {
    return `deepgrid:bm:${network}:${address}`;
}

export function useBalanceManagers() {
    const account = useCurrentAccount();
    const network = useCurrentNetwork();
    const client = useCurrentClient();

    const [managerId, setManagerIdState] = useState<string | null>(null);

    // IMPORTANT: sync managerId when account/network changes (fixes "No manager selected" issues)
    useEffect(() => {
        if (!account) {
            setManagerIdState(null);
            return;
        }
        const stored = localStorage.getItem(lsKey(network, account.address));
        setManagerIdState(stored);
    }, [account?.address, network]);

    const deepNoMgr = useMemo(() => {
        if (!account) return null;
        return client.$extend(deepbook({ address: account.address, network }));
    }, [account, client, network]);

    const managersQ = useQuery({
        queryKey: ["deepbookManagers", network, account?.address],
        enabled: !!account && !!deepNoMgr,
        queryFn: async () => {
            const ids: string[] = await (deepNoMgr as any).deepbook.getBalanceManagerIds(
                account!.address,
            );
            console.log("[useBalanceManager] getBalanceManagerIds ->", ids);
            return ids;
        },
    });

    // Auto-select a valid manager if none selected or stored value is invalid
    useEffect(() => {
        if (!account) return;
        const ids = managersQ.data ?? [];
        if (!ids.length) return;

        const stored = localStorage.getItem(lsKey(network, account.address));
        const storedValid = stored && ids.includes(stored);

        if (storedValid) {
            if (managerId !== stored) setManagerIdState(stored);
            return;
        }

        // pick first on-chain manager
        localStorage.setItem(lsKey(network, account.address), ids[0]);
        setManagerIdState(ids[0]);
        console.log("[useBalanceManager] auto-selected managerId ->", ids[0]);
    }, [account?.address, network, managersQ.data]); // intentionally not depending on managerId

    const setManagerId = (next: string | null) => {
        if (!account) return;
        if (next) localStorage.setItem(lsKey(network, account.address), next);
        else localStorage.removeItem(lsKey(network, account.address));
        setManagerIdState(next);
    };

    return {
        managerKey: MANAGER_KEY,
        managerId,
        managerIds: managersQ.data ?? [],
        managersLoading: managersQ.isPending,
        managersError: managersQ.error,
        setManagerId,
    };
}
