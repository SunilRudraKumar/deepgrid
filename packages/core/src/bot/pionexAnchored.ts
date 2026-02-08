import { Transaction } from '@mysten/sui/transactions';

export type Side = 'BUY' | 'SELL';

export type GridConfig = {
    min: number;      // price (human), e.g. 0.94
    max: number;      // price (human), e.g. 0.97
    grids: number;    // number of orders total, e.g. 6
    rawSize: number;  // base size per order (human), e.g. 1 SUI
};

export type BookParams = {
    tickSize: number;
    lotSize: number;
    minSize: number;
};

export type OpenOrderDetail = {
    side: Side;
    priceMicro: number;          // e.g. 949990 means 0.949990
    orderId: string;             // encoded id
    clientOrderId?: string;
    quantityAtomic?: string;
    filledQuantityAtomic?: string;
};

type DeepbookExtendedClient = {
    deepbook: {
        midPrice: (poolKey: string) => Promise<number>;
        poolBookParams: (poolKey: string) => Promise<BookParams>;
        accountOpenOrders: (poolKey: string, managerKey: string) => Promise<string[]>;
        getAccountOrderDetails: (poolKey: string, managerKey: string) => Promise<any[]>;
        deepBook: {
            placeLimitOrder: (args: {
                poolKey: string;
                balanceManagerKey: string;
                clientOrderId: bigint;
                price: number;       // human price
                quantity: number;    // human base quantity
                isBid: boolean;
                payWithDeep: boolean;
            }) => any;
            withdrawSettledAmounts: (poolKey: string, managerKey: string) => any;
        };
    };
    core: {
        signAndExecuteTransaction: (args: {
            transaction: Transaction;
            signer: any;
            include?: any;
        }) => Promise<any>;
    };
};

const PRICE_SCALE = 1_000_000; // DeepBook price micro scale

function priceToMicro(p: number): number {
    return Math.round(p * PRICE_SCALE);
}
function microToPrice(m: number): number {
    return m / PRICE_SCALE;
}
function roundToTickMicro(micro: number, tickMicro: number): number {
    return Math.round(micro / tickMicro) * tickMicro;
}
function floorToTickMicro(micro: number, tickMicro: number): number {
    return Math.floor(micro / tickMicro) * tickMicro;
}
function ceilToTickMicro(micro: number, tickMicro: number): number {
    return Math.ceil(micro / tickMicro) * tickMicro;
}
function roundDownToLot(size: number, lot: number): number {
    return Math.floor(size / lot) * lot;
}

function buildAnchoredLinesMicro(args: {
    min: number;
    max: number;
    grids: number;
    tickSize: number;
}): { linesMicro: number[]; tickMicro: number; stepMicro: number } {
    const { min, max, grids, tickSize } = args;

    const tickMicro = Math.max(1, Math.round(tickSize * PRICE_SCALE));
    const minMicro = floorToTickMicro(priceToMicro(min), tickMicro);
    const maxMicro = ceilToTickMicro(priceToMicro(max), tickMicro);

    if (maxMicro <= minMicro) throw new Error('GRID_MAX must be > GRID_MIN');
    if (grids < 2) throw new Error('GRID_GRIDS must be >= 2');

    // We want total open orders = grids, and price levels = grids+1
    const rawStep = (maxMicro - minMicro) / grids;
    const stepMicro = Math.max(tickMicro, floorToTickMicro(rawStep, tickMicro));
    if (stepMicro <= 0) throw new Error('Grid step too small for tick size');

    const linesMicro: number[] = [];
    for (let i = 0; i <= grids; i++) linesMicro.push(minMicro + i * stepMicro);

    // Force last line exactly to maxMicro (still on tick)
    linesMicro[linesMicro.length - 1] = maxMicro;

    // Ensure strictly increasing
    for (let i = 1; i < linesMicro.length; i++) {
        if (linesMicro[i] <= linesMicro[i - 1]) {
            throw new Error('Invalid grid: lines are not strictly increasing (adjust min/max/grids)');
        }
    }

    return { linesMicro, tickMicro, stepMicro };
}

function pivotIndexForMidMicro(linesMicro: number[], midMicro: number): number {
    // pivotIndex = greatest i where lines[i] <= mid
    let lo = 0;
    let hi = linesMicro.length - 1;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (linesMicro[mid] <= midMicro) lo = mid;
        else hi = mid - 1;
    }
    return lo; // 0..grids
}

function initialDesiredOrders(args: {
    linesMicro: number[];
    pivotIndex: number;
}): Array<{ side: Side; priceMicro: number }> {
    const { linesMicro, pivotIndex } = args;
    const grids = linesMicro.length - 1;

    const desired: Array<{ side: Side; priceMicro: number }> = [];

    // total desired orders = grids
    // BUY at lines[0..pivotIndex]
    for (let i = 0; i <= pivotIndex; i++) desired.push({ side: 'BUY', priceMicro: linesMicro[i] });

    // SELL at lines[pivotIndex+1..grids]
    for (let i = pivotIndex + 1; i <= grids; i++) desired.push({ side: 'SELL', priceMicro: linesMicro[i] });

    return desired;
}

function mapOpen(details: OpenOrderDetail[]): Map<string, OpenOrderDetail> {
    const m = new Map<string, OpenOrderDetail>();
    for (const d of details) m.set(d.orderId, d);
    return m;
}

function indexByPriceMicro(linesMicro: number[]): Map<number, number> {
    const m = new Map<number, number>();
    for (let i = 0; i < linesMicro.length; i++) m.set(linesMicro[i], i);
    return m;
}

function keyFor(side: Side, priceMicro: number): string {
    return `${side}:${priceMicro}`;
}

function existingSidePriceSet(details: OpenOrderDetail[]): Set<string> {
    const s = new Set<string>();
    for (const d of details) s.add(keyFor(d.side, d.priceMicro));
    return s;
}

function normalizeOrderDetails(raw: any[]): OpenOrderDetail[] {
    // raw elements look like:
    // { side, price, order_id, client_order_id, quantity, filled_quantity, ... }
    return raw.map((o) => ({
        side: (String(o.side).toUpperCase() as Side),
        priceMicro: Number(o.price),
        orderId: String(o.order_id),
        clientOrderId: o.client_order_id ? String(o.client_order_id) : undefined,
        quantityAtomic: o.quantity ? String(o.quantity) : undefined,
        filledQuantityAtomic: o.filled_quantity ? String(o.filled_quantity) : undefined,
    }));
}

export class PionexAnchoredGridBot {
    private prevOpen = new Map<string, OpenOrderDetail>();
    private clientOrderSeq = 0n;

    constructor(
        private readonly deps: {
            client: DeepbookExtendedClient;
            signer: any; // Ed25519Keypair
            poolKey: string;
            managerKey: string;
            cfg: GridConfig;
            dryRun?: boolean;
        },
    ) { }

    async tick(): Promise<any> {
        const { client, signer, poolKey, managerKey, cfg, dryRun } = this.deps;

        const mid = await client.deepbook.midPrice(poolKey);
        const midMicro = priceToMicro(mid);

        const { tickSize, lotSize, minSize } = await client.deepbook.poolBookParams(poolKey);

        const { linesMicro, tickMicro, stepMicro } = buildAnchoredLinesMicro({
            min: cfg.min,
            max: cfg.max,
            grids: cfg.grids,
            tickSize,
        });

        const size = roundDownToLot(Math.max(minSize, cfg.rawSize), lotSize);
        if (size < minSize) throw new Error(`GRID_SIZE too small after lot rounding. minSize=${minSize}, lotSize=${lotSize}`);

        // Fetch current open order details (this is the source of truth)
        const rawDetails = await client.deepbook.getAccountOrderDetails(poolKey, managerKey);
        const currentDetails = normalizeOrderDetails(rawDetails);
        const currentMap = mapOpen(currentDetails);
        const currentSP = existingSidePriceSet(currentDetails);

        const priceIndex = indexByPriceMicro(linesMicro);

        // Detect closed orders (present before, missing now) -> treat as "filled"
        const closed: OpenOrderDetail[] = [];
        for (const [id, prev] of this.prevOpen.entries()) {
            if (!currentMap.has(id)) closed.push(prev);
        }

        // Plan new orders from fills (Pionex rule)
        const toPlace: Array<{ side: Side; priceMicro: number }> = [];

        for (const c of closed) {
            const idx = priceIndex.get(c.priceMicro);
            if (idx === undefined) continue; // ignore non-grid orders

            if (c.side === 'BUY') {
                const sellIdx = idx + 1;
                if (sellIdx <= cfg.grids) {
                    const pm = linesMicro[sellIdx];
                    const k = keyFor('SELL', pm);
                    if (!currentSP.has(k)) {
                        toPlace.push({ side: 'SELL', priceMicro: pm });
                        currentSP.add(k);
                    }
                }
            } else {
                const buyIdx = idx - 1;
                if (buyIdx >= 0) {
                    const pm = linesMicro[buyIdx];
                    const k = keyFor('BUY', pm);
                    if (!currentSP.has(k)) {
                        toPlace.push({ side: 'BUY', priceMicro: pm });
                        currentSP.add(k);
                    }
                }
            }
        }

        // If first run (or after restart), ensure initial grid exists (but do NOT cancel/re-pivot)
        if (this.prevOpen.size === 0) {
            const pivotIndex = pivotIndexForMidMicro(linesMicro, midMicro);
            const desired = initialDesiredOrders({ linesMicro, pivotIndex });
            for (const d of desired) {
                const k = keyFor(d.side, d.priceMicro);
                if (!currentSP.has(k)) {
                    toPlace.push(d);
                    currentSP.add(k);
                }
            }
        }

        const summary = {
            ts: new Date().toISOString(),
            poolKey,
            mid,
            grid: {
                min: cfg.min,
                max: cfg.max,
                grids: cfg.grids,
                tickSize,
                tickMicro,
                stepMicro,
                lines: linesMicro.map(microToPrice),
            },
            size,
            existing: currentDetails.length,
            closed: closed.length,
            place: toPlace.length,
            dryRun: !!dryRun,
        };

        if (toPlace.length === 0) {
            // Update snapshot and return
            this.prevOpen = currentMap;
            return summary;
        }

        // Build tx (withdrawSettledAmounts + new limit orders)
        const tx = new Transaction();
        tx.add(client.deepbook.deepBook.withdrawSettledAmounts(poolKey, managerKey));

        for (const p of toPlace) {
            tx.add(
                client.deepbook.deepBook.placeLimitOrder({
                    poolKey,
                    balanceManagerKey: managerKey,
                    clientOrderId: this.nextClientOrderId(),
                    price: microToPrice(p.priceMicro),
                    quantity: size,
                    isBid: p.side === 'BUY',
                    payWithDeep: false,
                }),
            );
        }

        if (dryRun) {
            this.prevOpen = currentMap;
            return { ...summary, planned: toPlace.map((x) => ({ ...x, price: microToPrice(x.priceMicro) })) };
        }

        const res = await client.core.signAndExecuteTransaction({
            transaction: tx,
            signer,
            include: { effects: true },
        });

        // Update snapshot after execution
        this.prevOpen = currentMap;

        return {
            ...summary,
            kind: res?.$kind ?? null,
            digest: res?.Transaction?.digest ?? null,
            status: res?.Transaction?.effects?.status ?? null,
        };
    }

    private nextClientOrderId(): bigint {
        // u64-safe, deterministic within process
        const base = BigInt(Date.now());
        this.clientOrderSeq = (this.clientOrderSeq + 1n) % 10_000n;
        return base * 10_000n + this.clientOrderSeq;
    }
}
