import { useMemo, useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { deepbook } from "@mysten/deepbook-v3";
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

function pickPlaceMarket(deep: any) {
    const root = deep?.deepBook ?? deep?.deepbook ?? deep;
    const fn = root?.placeMarketOrder;
    return typeof fn === "function" ? fn.bind(root) : null;
}

export function MarketOrderCard({ poolKey }: { poolKey: string }) {
    const account = useCurrentAccount();
    const network = useCurrentNetwork();
    const client = useCurrentClient();
    const dAppKit = useDAppKit();

    const { managerId } = useBalanceManagers();

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

    const [side, setSide] = useState<"BUY" | "SELL">("BUY");
    const [qty, setQty] = useState("0.01");
    const [status, setStatus] = useState<string>("");

    async function submit() {
        try {
            if (!account) return;
            if (!managerId) {
                setStatus("Create a trading account first.");
                return;
            }
            if (!deepWithMgr) return;

            const quantity = Number(qty);
            if (!Number.isFinite(quantity) || quantity <= 0) {
                setStatus("Enter a valid quantity.");
                return;
            }

            const deep = (deepWithMgr as any).deepbook;
            const placeMarket = pickPlaceMarket(deep);
            if (!placeMarket) throw new Error("SDK mismatch: placeMarketOrder not found.");

            setStatus("Wallet will prompt...");

            const tx = new Transaction();
            tx.add(
                placeMarket({
                    poolKey,
                    balanceManagerKey: MANAGER_KEY,
                    clientOrderId: BigInt(Date.now()),
                    quantity,
                    isBid: side === "BUY",
                    payWithDeep: false,
                }),
            );

            await dAppKit.signAndExecuteTransaction({
                transaction: tx,
                options: { showEffects: true },
            });

            setStatus("Submitted.");
        } catch (e) {
            setStatus((e as Error).message);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Market Order</CardTitle>
                <CardDescription>Wallet-signed (DeepBook)</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                    <div>
                        <b>Pool:</b> {poolKey}
                    </div>
                    <div className="break-all">
                        <b>Manager:</b> {managerId ?? "(none)"}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        className={`px-3 py-2 rounded-md border text-sm ${side === "BUY" ? "bg-muted" : ""
                            }`}
                        onClick={() => setSide("BUY")}
                        type="button"
                    >
                        Buy
                    </button>
                    <button
                        className={`px-3 py-2 rounded-md border text-sm ${side === "SELL" ? "bg-muted" : ""
                            }`}
                        onClick={() => setSide("SELL")}
                        type="button"
                    >
                        Sell
                    </button>
                </div>

                <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Quantity</div>
                    <input
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        inputMode="decimal"
                        placeholder="0.01"
                    />
                </div>

                <button
                    className="px-3 py-2 rounded-md border text-sm"
                    onClick={submit}
                    type="button"
                    disabled={!account}
                >
                    Place Market {side}
                </button>

                {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}
            </CardContent>
        </Card>
    );
}
