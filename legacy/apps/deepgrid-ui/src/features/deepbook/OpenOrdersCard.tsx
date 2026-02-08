import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { deepbook } from "@mysten/deepbook-v3";
import {
    useCurrentAccount,
    useCurrentClient,
    useCurrentNetwork,
} from "@mysten/dapp-kit-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";

const MANAGER_KEY = "MANAGER";
const DEFAULT_POOL_KEY = "SUI_DBUSDC";

function lsKey(network: string, address: string) {
    return `deepgrid:bm:${network}:${address}`;
}

type OrderRow = {
    orderId: string;
    side: "BUY" | "SELL";
    priceMicro: number;
    price: number; // priceMicro / 1e6
    status?: string;
    quantity?: string | number;
    filled?: string | number;
    clientOrderId?: string | number;
    expireTs?: string | number;
};

export function OpenOrdersCard({ poolKey = DEFAULT_POOL_KEY }: { poolKey?: string }) {
    const account = useCurrentAccount();
    const network = useCurrentNetwork();
    const client = useCurrentClient();

    const [managerId, setManagerId] = useState<string | null>(() => {
        if (!account) return null;
        return localStorage.getItem(lsKey(network, account.address));
    });

    // DeepBook client without manager mapping (good enough to discover manager ids)
    const deepNoMgr = useMemo(() => {
        if (!account) return null;
        return client.$extend(deepbook({ address: account.address, network }));
    }, [account, client, network]);

    // 1) Discover balance managers on-chain
    const managersQ = useQuery({
        queryKey: ["deepbookManagers", network, account?.address],
        enabled: !!account && !!deepNoMgr,
        queryFn: async () => {
            const ids: string[] = await (deepNoMgr as any).deepbook.getBalanceManagerIds(
                account!.address,
            );
            console.log("[OpenOrders] getBalanceManagerIds ->", ids);
            return ids;
        },
    });

    // auto-pick the first on-chain manager if localStorage is empty
    useEffect(() => {
        if (!account) return;
        if (managerId) return;
        const ids = managersQ.data ?? [];
        if (!ids.length) return;

        localStorage.setItem(lsKey(network, account.address), ids[0]);
        setManagerId(ids[0]);
        console.log("[OpenOrders] auto-selected managerId ->", ids[0]);
    }, [account, managerId, managersQ.data, network]);

    // DeepBook client with manager mapping (required for accountOpenOrders(poolKey, managerKey))
    const deepWithMgr = useMemo(() => {
        if (!account || !managerId) return null;
        return client.$extend(
            deepbook({
                address: account.address,
                network,
                balanceManagers: { [MANAGER_KEY]: { address: managerId } },
            }),
        );
    }, [account, client, managerId, network]);

    // 2) Fetch open orders (details if available) + decode
    const ordersQ = useQuery({
        queryKey: ["openOrders", network, account?.address, poolKey, managerId],
        enabled: !!account && !!deepWithMgr && !!managerId,
        refetchInterval: 5000,
        queryFn: async (): Promise<OrderRow[]> => {
            console.log("[OpenOrders] fetching", { network, poolKey, managerId });

            const db = (deepWithMgr as any).deepbook;

            console.log(
                "[OpenOrders] getAccountOrderDetails typeof:",
                typeof db.getAccountOrderDetails,
            );

            // Try DETAILS first
            if (typeof db.getAccountOrderDetails === "function") {
                try {
                    const details = await db.getAccountOrderDetails(poolKey, MANAGER_KEY);
                    console.log("[OpenOrders] getAccountOrderDetails OK:", details);

                    return (details as any[]).map((d: any) => {
                        const decoded = db.decodeOrderId(BigInt(d.order_id));
                        const priceMicro = Number(decoded.price);
                        return {
                            orderId: String(d.order_id),
                            side: decoded.isBid ? "BUY" : "SELL",
                            priceMicro,
                            price: priceMicro / 1_000_000,
                            status: d.status,
                            quantity: d.quantity,
                            filled: d.filled_quantity,
                            clientOrderId: d.client_order_id,
                            expireTs: d.expire_timestamp,
                        };
                    });
                } catch (e) {
                    console.error("[OpenOrders] getAccountOrderDetails FAILED, falling back:", e);
                }
            }

            // Fallback: IDs only
            const ids: string[] = await db.accountOpenOrders(poolKey, MANAGER_KEY);
            console.log("[OpenOrders] accountOpenOrders ->", ids);

            const decoded = ids.map((id) => {
                const d = db.decodeOrderId(BigInt(id));
                const priceMicro = Number(d.price);
                return {
                    orderId: id,
                    side: d.isBid ? "BUY" : "SELL",
                    priceMicro,
                    price: priceMicro / 1_000_000,
                } satisfies OrderRow;
            });

            console.log("[OpenOrders] decoded ->", decoded);
            return decoded;
        },
    });

    if (!account) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Open Orders</CardTitle>
                <CardDescription>{poolKey} (wallet read-only)</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                    <div>
                        <b>Network:</b> {network}
                    </div>
                    <div className="break-all">
                        <b>Manager:</b> {managerId ?? "(none)"}
                    </div>
                    <div className="break-all">
                        <b>Discovered managers:</b>{" "}
                        {managersQ.data?.length ? managersQ.data.join(", ") : "(none)"}
                    </div>
                </div>

                {ordersQ.error ? (
                    <div className="text-sm">{(ordersQ.error as Error).message}</div>
                ) : ordersQ.isPending ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                ) : (ordersQ.data?.length ?? 0) === 0 ? (
                    <div className="text-sm text-muted-foreground">No open orders.</div>
                ) : (
                    <div className="space-y-2">
                        {(ordersQ.data ?? []).map((o) => (
                            <div key={o.orderId} className="rounded-md border p-2">
                                <div className="text-sm flex flex-wrap gap-x-3 gap-y-1">
                                    <b>{o.side}</b>
                                    <span>@ {Number(o.price).toFixed(6)}</span>
                                    {o.status ? <span>status: {String(o.status)}</span> : null}
                                    {o.quantity !== undefined ? (
                                        <span>qty: {String(o.quantity)}</span>
                                    ) : null}
                                    {o.filled !== undefined ? (
                                        <span>filled: {String(o.filled)}</span>
                                    ) : null}
                                </div>
                                <div className="text-xs break-all text-muted-foreground">
                                    {o.orderId}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
