import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deepbook } from "@mysten/deepbook-v3";
import { Transaction } from "@mysten/sui/transactions";
import {
    useCurrentAccount,
    useCurrentClient,
    useCurrentNetwork,
    useDAppKit,
} from "@mysten/dapp-kit-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";

import { useBalanceManagers } from "./hooks/useBalanceManagers";

const MANAGER_KEY = "MANAGER";
const DEFAULT_POOL_KEY = "SUI_DBUSDC";

type OrderRow = {
    order_id: string;
    client_order_id?: string;
    price?: string | number;
    quantity?: string | number;
    filled_quantity?: string | number;
    is_bid?: boolean;
    status?: string;
};

export function OpenOrdersTable({ poolKey = DEFAULT_POOL_KEY }: { poolKey?: string }) {
    const account = useCurrentAccount();
    const network = useCurrentNetwork();
    const client = useCurrentClient();
    const dAppKit = useDAppKit();
    const qc = useQueryClient();

    const { managerId, managerIds } = useBalanceManagers();
    const displayManagerId = managerId ?? managerIds[0] ?? null;

    const deepWithMgr = useMemo(() => {
        if (!account || !displayManagerId) return null;
        return client.$extend(
            deepbook({
                address: account.address,
                network,
                balanceManagers: { [MANAGER_KEY]: { address: displayManagerId } },
            }),
        );
    }, [account, client, network, displayManagerId]);

    const [busyId, setBusyId] = useState<string | null>(null);

    const ordersQ = useQuery({
        queryKey: ["orderDetails", network, account?.address, poolKey, displayManagerId],
        enabled: !!account && !!deepWithMgr && !!displayManagerId,
        refetchInterval: 5000,
        queryFn: async () => {
            const db = (deepWithMgr as any).deepbook;
            // Docs: getAccountOrderDetails(poolKey, managerKey) :contentReference[oaicite:7]{index=7}
            const rows: OrderRow[] = await db.getAccountOrderDetails(poolKey, MANAGER_KEY);
            return rows ?? [];
        },
    });

    async function cancelOrder(orderId: string) {
        if (!deepWithMgr) return;
        setBusyId(orderId);
        try {
            const db = (deepWithMgr as any).deepbook;
            if (typeof db.cancelOrder !== "function") {
                throw new Error(`SDK mismatch: cancelOrder not found. keys=${Object.keys(db ?? {}).join(", ")}`);
            }

            const tx = new Transaction();
            // Docs: cancelOrder(poolKey, managerKey, orderId) :contentReference[oaicite:8]{index=8}
            // orderId may be huge; pass as string first, fallback to BigInt if needed
            try {
                tx.add(db.cancelOrder(poolKey, MANAGER_KEY, orderId));
            } catch {
                tx.add(db.cancelOrder(poolKey, MANAGER_KEY, BigInt(orderId)));
            }

            await dAppKit.signAndExecuteTransaction({
                transaction: tx,
                options: { showEffects: true },
            });

            await qc.invalidateQueries({ queryKey: ["orderDetails", network, account?.address, poolKey, displayManagerId] });
        } finally {
            setBusyId(null);
        }
    }

    if (!account) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Open Orders</CardTitle>
                <CardDescription>{poolKey}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="text-xs break-all">
                    <b>Manager:</b> {displayManagerId ?? "(none)"}{" "}
                    {!displayManagerId ? <span className="text-muted-foreground">(create & register first)</span> : null}
                </div>

                {ordersQ.error ? (
                    <div className="text-sm">{(ordersQ.error as Error).message}</div>
                ) : ordersQ.isPending ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                ) : (ordersQ.data?.length ?? 0) === 0 ? (
                    <div className="text-sm text-muted-foreground">No open orders.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-muted-foreground">
                                <tr className="border-b">
                                    <th className="py-2 text-left">Side</th>
                                    <th className="py-2 text-left">Price</th>
                                    <th className="py-2 text-left">Qty</th>
                                    <th className="py-2 text-left">Filled</th>
                                    <th className="py-2 text-left">Order ID</th>
                                    <th className="py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(ordersQ.data ?? []).map((o) => (
                                    <tr key={o.order_id} className="border-b">
                                        <td className="py-2">{o.is_bid ? "BUY" : "SELL"}</td>
                                        <td className="py-2">{String(o.price ?? "")}</td>
                                        <td className="py-2">{String(o.quantity ?? "")}</td>
                                        <td className="py-2">{String(o.filled_quantity ?? "")}</td>
                                        <td className="py-2 break-all">{o.order_id}</td>
                                        <td className="py-2 text-right">
                                            <button
                                                className="px-3 py-1 rounded-md border"
                                                disabled={busyId === o.order_id}
                                                onClick={() => cancelOrder(o.order_id)}
                                            >
                                                {busyId === o.order_id ? "Cancelling..." : "Cancel"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
