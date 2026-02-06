import { useQuery } from "@tanstack/react-query";
import { useDeepbookClient } from "./useDeepbookClient";
import { MANAGER_KEY } from "../constants";

function microToPrice(priceMicro: number): number {
    return priceMicro / 1_000_000;
}

export type OpenOrderRow = {
    order_id: string;
    side: "BUY" | "SELL";
    priceMicro: number;
    price: number;
    status?: string;
    quantity?: string | number;
    filled_quantity?: string | number;
    client_order_id?: string | number;
    expire_timestamp?: string | number;
};

export function useOpenOrders(poolKey: string, managerId: string | null) {
    const deepClient = useDeepbookClient(managerId);

    return useQuery({
        queryKey: ["openOrders", poolKey, managerId],
        enabled: !!deepClient && !!managerId,
        refetchInterval: 5000,
        queryFn: async (): Promise<OpenOrderRow[]> => {
            const db = (deepClient as any).deepbook;

            // Preferred: detailed rows
            if (typeof db.getAccountOrderDetails === "function") {
                const details = await db.getAccountOrderDetails(poolKey, MANAGER_KEY);
                console.log("[OpenOrders] getAccountOrderDetails ->", details);

                return details.map((d: any) => {
                    const decoded = db.decodeOrderId(BigInt(d.order_id));
                    return {
                        order_id: d.order_id,
                        side: decoded.isBid ? "BUY" : "SELL",
                        priceMicro: decoded.price,
                        price: microToPrice(decoded.price),
                        status: d.status,
                        quantity: d.quantity,
                        filled_quantity: d.filled_quantity,
                        client_order_id: d.client_order_id,
                        expire_timestamp: d.expire_timestamp,
                    };
                });
            }

            // Fallback: ids only
            const ids: string[] = await db.accountOpenOrders(poolKey, MANAGER_KEY);
            console.log("[OpenOrders] accountOpenOrders ->", ids);

            return ids.map((id) => {
                const decoded = db.decodeOrderId(BigInt(id));
                return {
                    order_id: id,
                    side: decoded.isBid ? "BUY" : "SELL",
                    priceMicro: decoded.price,
                    price: microToPrice(decoded.price),
                };
            });
        },
    });
}
