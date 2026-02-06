import { useEffect, useMemo, useState } from "react";
import {
    useCurrentAccount,
    useCurrentClient,
    useCurrentNetwork,
    useDAppKit,
} from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import { deepbook } from "@mysten/deepbook-v3";
import { useQueryClient } from "@tanstack/react-query";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../../components/ui/card";

import { useBalanceManagers } from "../hooks/useBalanceManagers";

const MANAGER_KEY = "MANAGER";
const DEFAULT_POOL_KEY = "SUI_DBUSDC";

function lsKey(network: string, address: string) {
    return `deepgrid:bm:${network}:${address}`;
}

/** Many wallets nest results differently. Search common shapes. */
function pickFirst<T>(cands: any[], pred: (v: any) => v is T): T | null {
    for (const c of cands) if (pred(c)) return c;
    return null;
}

function extractDigest(res: any): string | null {
    const candidates = [
        res?.digest,
        res?.result?.digest,
        res?.rawTransaction?.result?.digest,
        res?.transactionDigest,
        res?.result?.transactionDigest,
        res?.effects?.transactionDigest,
        res?.result?.effects?.transactionDigest,
        res?.rawTransaction?.result?.effects?.transactionDigest,
    ];
    return pickFirst<string>(candidates, (x): x is string => typeof x === "string" && x.length > 0);
}

function extractBalanceManagerId(res: any): string | null {
    const r = res?.result ?? res?.rawTransaction?.result ?? res;

    // 1) events[].parsedJson.balance_manager_id
    const events = r?.events ?? r?.result?.events;
    if (Array.isArray(events)) {
        for (const e of events) {
            const id = e?.parsedJson?.balance_manager_id;
            if (typeof id === "string" && id.startsWith("0x")) return id;
        }
    }

    // 2) objectChanges[].created where objectType includes ::balance_manager::BalanceManager
    const objectChanges = r?.objectChanges ?? r?.result?.objectChanges;
    if (Array.isArray(objectChanges)) {
        for (const c of objectChanges) {
            if (c?.type !== "created") continue;
            const t = c?.objectType;
            const id = c?.objectId;
            if (typeof t === "string" && t.includes("::balance_manager::BalanceManager")) {
                if (typeof id === "string" && id.startsWith("0x")) return id;
            }
        }
    }

    // 3) effects.created[].reference.objectId (RPC effects shape)
    const effects = r?.effects ?? r?.result?.effects;
    const created = effects?.created;
    if (Array.isArray(created)) {
        for (const cr of created) {
            const id = cr?.reference?.objectId ?? cr?.objectId;
            if (typeof id === "string" && id.startsWith("0x")) return id;
        }
    }

    return null;
}

function pickCreateBM(bm: any) {
    const cands = [
        bm?.createAndShareBalanceManager, // docs name :contentReference[oaicite:1]{index=1}
        bm?.createAndShareBalanceManager?.bind?.(bm),
        bm?.createAndShareBalanceManager,
        bm?.createAndShare,
        bm?.createAndShareBalanceManager,
        bm?.createBalanceManager,
        bm?.create,
    ];
    return cands.find((f) => typeof f === "function") ?? null;
}

function pickRegisterBM(deep: any, bm: any) {
    const cands = [
        bm?.registerBalanceManager, // docs name :contentReference[oaicite:2]{index=2}
        deep?.registerBalanceManager,
    ];
    return cands.find((f) => typeof f === "function") ?? null;
}

export function TradingAccount() {
    const account = useCurrentAccount();
    const network = useCurrentNetwork();
    const client = useCurrentClient();
    const dAppKit = useDAppKit();
    const queryClient = useQueryClient();

    const { managerId, managerIds, setManagerId } = useBalanceManagers();

    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);

    const hasRegisteredManager = managerIds.length > 0;
    const displayManagerId = managerId ?? managerIds[0] ?? null;

    // client without mapping (safe for create)
    const deepNoMgr = useMemo(() => {
        if (!account) return null;
        return client.$extend(deepbook({ address: account.address, network }));
    }, [account, client, network]);

    // client with mapping (required for register/deposit/orders)
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

    useEffect(() => {
        if (!account) return;
        console.log("[TradingAccount]", { network, address: account.address, managerIds, managerId, displayManagerId });
    }, [account, network, managerIds, managerId, displayManagerId]);

    async function refreshManagers() {
        if (!account) return;
        await queryClient.invalidateQueries({
            queryKey: ["deepbookManagers", network, account.address],
        });
    }

    async function createTradingAccount() {
        if (!account || !deepNoMgr) return;

        if (hasRegisteredManager) {
            setStatus("Trading account already exists for this wallet.");
            return;
        }

        setBusy(true);
        try {
            setStatus("Creating Balance Manager (wallet will prompt)...");

            const db = (deepNoMgr as any).deepbook;
            const bm = db?.balanceManager;

            const createFn = pickCreateBM(bm);
            if (!createFn) {
                throw new Error(
                    `SDK mismatch: createAndShareBalanceManager not found. balanceManager keys: ${Object.keys(bm ?? {}).join(", ")}`
                );
            }

            const tx = new Transaction();
            tx.add(createFn());

            const res = await dAppKit.signAndExecuteTransaction({
                transaction: tx,
                options: { showEffects: true, showEvents: true, showObjectChanges: true },
            });

            console.log("[TradingAccount] create res:", res);

            const newId = extractBalanceManagerId(res);
            if (!newId) {
                const digest = extractDigest(res);
                throw new Error(
                    `Create succeeded but could not extract BalanceManager id. digest=${digest ?? "(none)"} (see console log).`
                );
            }

            localStorage.setItem(lsKey(network, account.address), newId);
            setManagerId(newId);

            setStatus(`Created Balance Manager: ${newId}. Next: Register.`);
        } finally {
            setBusy(false);
        }
    }

    async function registerManager() {
        if (!account) return;
        const id = displayManagerId;
        if (!id) {
            setStatus("No manager id available to register.");
            return;
        }

        setBusy(true);
        try {
            setStatus("Registering Balance Manager (wallet will prompt)...");

            const deep = (deepWithMgr as any)?.deepbook;
            const bm = deep?.balanceManager;
            const registerFn = pickRegisterBM(deep, bm);

            if (!registerFn) {
                throw new Error(
                    `SDK mismatch: registerBalanceManager not found. deep keys: ${Object.keys(deep ?? {}).join(", ")}`
                );
            }

            const tx = new Transaction();
            // Docs: registerBalanceManager(managerKey) :contentReference[oaicite:3]{index=3}
            tx.add(registerFn(MANAGER_KEY));

            const res = await dAppKit.signAndExecuteTransaction({
                transaction: tx,
                options: { showEffects: true },
            });

            console.log("[TradingAccount] register res:", res);

            setStatus("Registered. Refreshing...");
            await refreshManagers();
            setStatus("Registered.");
        } finally {
            setBusy(false);
        }
    }

    async function createAndRegister() {
        // Two txs (create must exist on-chain before registry lookup).
        await createTradingAccount();
        await new Promise((r) => setTimeout(r, 250));
        await registerManager();
    }

    async function depositSui(amountSui: number) {
        if (!account || !deepWithMgr || !displayManagerId) return;

        setBusy(true);
        try {
            setStatus("Depositing SUI (wallet will prompt)...");

            const deep = (deepWithMgr as any).deepbook;
            const bm = deep?.balanceManager;

            if (typeof bm?.depositIntoManager !== "function") {
                throw new Error("SDK mismatch: depositIntoManager not found.");
            }

            // Docs: depositIntoManager(managerKey, coinKey, amount:number) :contentReference[oaicite:4]{index=4}
            const tx = new Transaction();
            tx.add(bm.depositIntoManager(MANAGER_KEY, "SUI", amountSui));

            await dAppKit.signAndExecuteTransaction({
                transaction: tx,
                options: { showEffects: true },
            });

            setStatus("Deposit complete.");
        } finally {
            setBusy(false);
        }
    }

    if (!account) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Trading Account</CardTitle>
                <CardDescription>DeepBook Balance Manager</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="text-xs break-all">
                    <b>Registered managers (discoverable):</b>{" "}
                    {managerIds.length ? managerIds.join(", ") : "(none)"}
                </div>

                <div className="text-sm space-y-1">
                    <div><b>Network:</b> {network}</div>
                    <div className="break-all"><b>Manager:</b> {displayManagerId ?? "(none)"}</div>

                    {hasRegisteredManager ? (
                        <div className="text-muted-foreground">Trading account already exists for this wallet.</div>
                    ) : displayManagerId ? (
                        <div className="text-muted-foreground">Manager created locally but not registered yet.</div>
                    ) : null}
                </div>

                {!hasRegisteredManager && !displayManagerId ? (
                    <div className="flex flex-wrap gap-2">
                        <button className="px-3 py-2 rounded-md border" disabled={busy} onClick={createTradingAccount}>
                            Create Trading Account
                        </button>

                        <button
                            className="px-3 py-2 rounded-md border"
                            disabled={busy}
                            onClick={createAndRegister}
                            title="Sends two transactions: create then register"
                        >
                            Create & Register
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {!hasRegisteredManager ? (
                            <button className="px-3 py-2 rounded-md border" disabled={busy} onClick={registerManager}>
                                Register
                            </button>
                        ) : null}

                        <button className="px-3 py-2 rounded-md border" disabled={busy} onClick={() => depositSui(0.1)}>
                            Deposit 0.1 SUI
                        </button>
                    </div>
                )}

                {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}
            </CardContent>
        </Card>
    );
}
