import { useMemo } from "react";
import { deepbook } from "@mysten/deepbook-v3";
import { useCurrentAccount, useCurrentClient, useCurrentNetwork } from "@mysten/dapp-kit-react";
import { MANAGER_KEY } from "../constants";

export function useDeepbookClient(managerId?: string | null) {
    const account = useCurrentAccount();
    const network = useCurrentNetwork();
    const client = useCurrentClient();

    return useMemo(() => {
        if (!account) return null;

        const balanceManagers = managerId ? { [MANAGER_KEY]: { address: managerId } } : undefined;

        return client.$extend(
            deepbook({
                address: account.address,
                network,
                balanceManagers,
            }),
        );
    }, [account, client, managerId, network]);
}
