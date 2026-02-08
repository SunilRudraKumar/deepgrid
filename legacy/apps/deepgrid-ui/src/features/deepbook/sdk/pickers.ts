import { Transaction } from "@mysten/sui/transactions";

export function pickCreateBM(bm: any) {
    const cands = [
        bm?.createAndShareBalanceManager,
        bm?.createBalanceManager,
        bm?.createAndShare,
        bm?.create,
    ];
    return cands.find((f) => typeof f === "function") ?? null;
}

export function pickRegisterBM(deep: any, bm: any) {
    const cands = [bm?.registerBalanceManager, deep?.registerBalanceManager];
    return cands.find((f) => typeof f === "function") ?? null;
}

export function pickDepositIntoManager(bm: any) {
    const fn = bm?.depositIntoManager;
    return typeof fn === "function" ? fn.bind(bm) : null;
}

export function pickPlaceMarket(deep: any) {
    const root = deep?.deepBook ?? deep?.deepbook ?? deep;
    const fn = root?.placeMarketOrder;
    return typeof fn === "function" ? fn.bind(root) : null;
}

export function pickWithdrawSettled(deep: any) {
    const root = deep?.deepBook ?? deep?.deepbook ?? deep;
    const cands = [
        deep?.withdrawSettledAmounts,
        deep?.balanceManager?.withdrawSettledAmounts,
        root?.withdrawSettledAmounts,
        root?.balanceManager?.withdrawSettledAmounts,
    ];
    return cands.find((f) => typeof f === "function") ?? null;
}

export function extractCreatedObjectId(res: any, typeIncludes: string) {
    const changes: any[] = res?.objectChanges ?? res?.Transaction?.objectChanges ?? [];
    const created = changes.find(
        (c) =>
            c?.type === "created" &&
            typeof c?.objectType === "string" &&
            c.objectType.includes(typeIncludes),
    );
    return created?.objectId as string | undefined;
}

export function txAdd(tx: Transaction, cmd: any) {
    // convenience so we never accidentally add undefined
    if (!cmd) throw new Error("Attempted to add empty command to transaction.");
    tx.add(cmd);
}
