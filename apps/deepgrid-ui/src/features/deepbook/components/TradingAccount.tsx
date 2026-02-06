import { useMemo, useState } from "react";
import {
    useCurrentAccount,
    useCurrentClient,
    useCurrentNetwork,
    useDAppKit,
} from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import { deepbook } from "@mysten/deepbook-v3";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../../components/ui/card";

import { useBalanceManagers } from "../hooks/useBalanceManagers";

const MANAGER_KEY = "MANAGER";

function lsKey(network: string, address: string) {
    return `deepgrid:bm:${network}:${address}`;
}

/** DeepBook SDK sometimes returns “(tx) => void”, sometimes a tx command. Support both. */
function applyTx(tx: Transaction, cmdOrFn: any) {
    if (typeof cmdOrFn === "function") {
        cmdOrFn(tx);
        return;
    }
    // fallback if SDK returns a command object
    // @ts-expect-error - tx.add exists in your current setup
    tx.add(cmdOrFn);
}

/** Extract digest defensively from different wallet response shapes */
function extractDigest(res: any): string | null {
    return (
        res?.result?.Transaction?.digest ??
        res?.Transaction?.digest ??
        res?.digest ??
        res?.result?.digest ??
        res?.effects?.transactionDigest ??
        res?.transactionDigest ??
        null
    );
}

/** Prefer events, fallback to objectChanges */
function extractBalanceManagerIdFromTxBlock(txb: any): string | null {
    const evId =
        txb?.events
            ?.map((e: any) => e?.parsedJson?.balance_manager_id)
            ?.find((x: any) => typeof x === "string" && x.startsWith("0x")) ?? null;
    if (evId) return evId;

    const ocId =
        txb?.objectChanges
            ?.map((c: any) => {
                if (c?.type !== "created") return null;
                const t = c?.objectType;
                if (typeof t !== "string") return null;
                if (!t.includes("::balance_manager::BalanceManager")) return null;
                return c?.objectId;
            })
            ?.find((x: any) => typeof x === "string" && x.startsWith("0x")) ?? null;

    return ocId;
}

function pickCreateBM(bm: any) {
    const cands = [
        bm?.createAndShareBalanceManager,
        bm?.createBalanceManager,
        bm?.createAndShare,
        bm?.create,
    ];
    return cands.find((f) => typeof f === "function") ?? null;
}

function pickRegisterBM(deep: any, bm: any) {
    const cands = [bm?.registerBalanceManager, deep?.registerBalanceManager];
    return cands.find((f) => typeof f === "function") ?? null;
}

export function TradingAccount() {
    const account = useCurrentAccount();
    const network = useCurrentNetwork();
    const client = useCurrentClient();
    const dAppKit = useDAppKit();

    const { managerId, managerIds, setManagerId } = useBalanceManagers();

    const [status, setStatus] = useState<string>("");
    const [busy, setBusy] = useState(false);

    const hasRegistered = managerIds.length > 0;
    const displayManagerId = managerId ?? managerIds[0] ?? null;

    // DeepBook client (mapping only when we have a manager id)
    const deepClient = useMemo(() => {
        if (!account) return null;

        const balanceManagers = displayManagerId
            ? { [MANAGER_KEY]: { address: displayManagerId } }
            : undefined;

        return client.$extend(
            deepbook({
                address: account.address,
                network,
                balanceManagers,
            }),
        );
    }, [account, client, network, displayManagerId]);

    async function createTradingAccount() {
        if (!account || !deepClient) return;

        if (hasRegistered) {
            setStatus("Trading account already exists for this wallet.");
            return;
        }

        setBusy(true);
        try {
            setStatus("Creating Balance Manager (wallet prompt)...");

            const db = (deepClient as any).deepbook;
            const bm = db?.balanceManager;

            const createFn = pickCreateBM(bm);
            if (!createFn) {
                throw new Error(
                    `SDK mismatch: no create BM function found. balanceManager keys: ${Object.keys(
                        bm ?? {},
                    ).join(", ")}`,
                );
            }

            const tx = new Transaction();
            // DeepBook SDK pattern: call builder onto tx :contentReference[oaicite:3]{index=3}
            applyTx(tx, createFn());

            const res = await dAppKit.signAndExecuteTransaction({
                transaction: tx,
            });

            const digest = extractDigest(res);
            if (!digest) {
                throw new Error("No digest returned from wallet response (see console).");
            }

            // Read from RPC to reliably get events/objectChanges
            const txb = await client.getTransactionBlock({
                digest,
                options: { showEvents: true, showObjectChanges: true, showEffects: true },
            });

            const newBmId = extractBalanceManagerIdFromTxBlock(txb);
            if (!newBmId) {
                throw new Error("Tx succeeded but could not extract BalanceManager id.");
            }

            localStorage.setItem(lsKey(network, account.address), newBmId);
            setManagerId(newBmId);

            setStatus(`Created Balance Manager: ${newBmId}. Now register it.`);
        } finally {
            setBusy(false);
        }
    }

    async function registerTradingAccount() {
        if (!account) return;

        const id = displayManagerId;
        if (!id) {
            setStatus("No Balance Manager id available to register.");
            return;
        }

        setBusy(true);
        try {
            setStatus("Registering Balance Manager (wallet prompt)...");

            // Ensure mapping exists for MANAGER_KEY during register call
            const deepWithMgr = client.$extend(
                deepbook({
                    address: account.address,
                    network,
                    balanceManagers: { [MANAGER_KEY]: { address: id } },
                }),
            );

            const deep = (deepWithMgr as any).deepbook;
            const bm = deep?.balanceManager;

            const registerFn = pickRegisterBM(deep, bm);
            if (!registerFn) {
                throw new Error(
                    `SDK mismatch: registerBalanceManager not found. deep keys: ${Object.keys(
                        deep ?? {},
                    ).join(", ")}`,
                );
            }

            const tx = new Transaction();
            // DeepBook SDK pattern: registerBalanceManager(key)(tx) :contentReference[oaicite:4]{index=4}
            applyTx(tx, registerFn(MANAGER_KEY));

            await dAppKit.signAndExecuteTransaction({ transaction: tx });

            setStatus("Registered. Reload your page or re-open the Trade screen.");
        } finally {
            setBusy(false);
        }
    }

    if (!account) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Trading Account</CardTitle>
                <CardDescription>Balance Manager (create + register)</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                    <div>
                        <b>Network:</b> {network}
                    </div>
                    <div className="break-all">
                        <b>Registered managers:</b>{" "}
                        {managerIds.length ? managerIds.join(", ") : "(none)"}
                    </div>
                    <div className="break-all">
                        <b>Local manager:</b> {displayManagerId ?? "(none)"}
                    </div>
                </div>

                {hasRegistered ? (
                    <div className="text-sm text-muted-foreground">
                        Trading account already exists for this wallet.
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {!displayManagerId ? (
                            <button
                                className="px-3 py-2 rounded-md border"
                                disabled={busy}
                                onClick={createTradingAccount}
                            >
                                Create Trading Account
                            </button>
                        ) : (
                            <button
                                className="px-3 py-2 rounded-md border"
                                disabled={busy}
                                onClick={registerTradingAccount}
                            >
                                Register Trading Account
                            </button>
                        )}
                    </div>
                )}

                {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}
            </CardContent>
        </Card>
    );
}
