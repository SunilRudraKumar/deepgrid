import { useQuery } from "@tanstack/react-query";
import { useDeepbookClient } from "./useDeepbookClient";
import { MANAGER_KEY, BASE_COIN_KEY, QUOTE_COIN_KEY } from "../constants";

export function useManagerBalances(managerId: string | null) {
    const deepClient = useDeepbookClient(managerId);

    return useQuery({
        queryKey: ["managerBalances", managerId],
        enabled: !!deepClient && !!managerId,
        queryFn: async () => {
            const base = await (deepClient as any).deepbook.checkManagerBalance(MANAGER_KEY, BASE_COIN_KEY);
            const quote = await (deepClient as any).deepbook.checkManagerBalance(MANAGER_KEY, QUOTE_COIN_KEY);
            return { base, quote };
        },
        refetchInterval: 5000,
    });
}
