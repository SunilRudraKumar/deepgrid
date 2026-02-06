import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadEnv } from '@deepgrid/core/env';
import { makeDeepbookClient, keypairFromSuiPrivKey } from '@deepgrid/core/sui';

loadEnv();

type Net = 'testnet' | 'mainnet';
type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: { code: string; message: string } };
type ApiResp<T> = ApiOk<T> | ApiErr;

function ok<T>(data: T): ApiOk<T> { return { ok: true, data }; }
function err(code: string, message: string): ApiErr { return { ok: false, error: { code, message } }; }

function must(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing ${name}`);
    return v;
}

function getNet(): Net {
    return (process.env.SUI_ENV ?? 'testnet') as Net;
}

function getDefaultPoolKey(): string {
    return process.env.DEEPBOOK_POOL_KEY ?? 'SUI_DBUSDC';
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

// ---- SSE event bus (simple, local-first) ----
type BotEvent =
    | { t: 'tick'; ts: string; mid: number; existing: number; desired: number; cancel: number; place: number; digest?: string | null }
    | { t: 'info'; ts: string; msg: string }
    | { t: 'error'; ts: string; msg: string };

const clients = new Set<(line: string) => void>();
function emit(ev: BotEvent) {
    const line = `data: ${JSON.stringify(ev)}\n\n`;
    for (const send of clients) send(line);
}

// ---- Minimal anchored-grid bot supervisor (single instance for v1) ----
type BotConfig = {
    poolKey: string;
    managerId: string;
    managerKey: string;
    min: number;
    max: number;
    grids: number;
    size: number;
    intervalMs: number;
    dryRun: boolean;
};

let botRunning = false;
let botInFlight = false;
let botTimer: NodeJS.Timeout | null = null;
let botLast: { running: boolean; cfg: BotConfig | null; lastDigest: string | null; lastError: string | null } = {
    running: false,
    cfg: null,
    lastDigest: null,
    lastError: null,
};

// IMPORTANT: This is “anchored reconcile” style (what you already built).
// It keeps the grid populated at the desired lines. When buys fill, sells above remain;
// when sells fill, buys below remain. That’s the core Pionex-style grid behavior.
async function reconcileAnchoredOnce(cfg: BotConfig): Promise<{ cancel: number; place: number; desired: number; existing: number; mid: number; digest: string | null }> {
    const net = getNet();

    const botPk = process.env.BOT_PRIVATE_KEY;
    const tradeCapId = process.env.TRADE_CAP_ID;

    if (!botPk || !tradeCapId) throw new Error('BOT_PRIVATE_KEY / TRADE_CAP_ID required to run bot');

    const bot = keypairFromSuiPrivKey(botPk);
    const botAddress = bot.toSuiAddress();

    const client = makeDeepbookClient({
        net,
        address: botAddress,
        managerId: cfg.managerId,
        managerKey: cfg.managerKey,
        tradeCapId,
    });

    // Read state
    const mid = await client.deepbook.midPrice(cfg.poolKey);
    const { tickSize, lotSize, minSize } = await client.deepbook.poolBookParams(cfg.poolKey);

    // Normalize
    const tick = tickSize;
    const roundDownToTick = (p: number) => Math.floor(p / tick) * tick;
    const roundUpToTick = (p: number) => Math.ceil(p / tick) * tick;
    const roundDownToLot = (q: number) => Math.floor(q / lotSize) * lotSize;

    const min = roundDownToTick(cfg.min);
    const max = roundUpToTick(cfg.max);
    const grids = Math.max(1, Math.floor(cfg.grids));
    const size = roundDownToLot(Math.max(minSize, cfg.size));

    if (!(min < max)) throw new Error(`GRID_MIN must be < GRID_MAX (got ${min} >= ${max})`);
    if (size < minSize) throw new Error(`GRID_SIZE too small after rounding (size=${size}, minSize=${minSize})`);

    // Build grid lines (inclusive endpoints => grids steps => grids+1 lines)
    // step is rounded to ticks.
    const step = (max - min) / grids;
    const stepTicks = Math.max(1, Math.round(step / tick));
    const stepPrice = stepTicks * tick;

    // pivot is nearest grid line <= mid (anchored)
    const pivotIndex = Math.min(grids, Math.max(0, Math.floor((mid - min) / stepPrice)));
    const pivotPrice = min + pivotIndex * stepPrice;

    const desired: Array<{ side: 'BUY' | 'SELL'; price: number }> = [];
    // BUY lines strictly below pivot
    for (let i = 0; i < pivotIndex; i++) desired.push({ side: 'BUY', price: min + i * stepPrice });
    // SELL lines strictly above pivot
    for (let i = pivotIndex + 1; i <= grids; i++) desired.push({ side: 'SELL', price: min + i * stepPrice });

    // Fetch open orders and map by (side, priceMicro) to decide what to cancel/place
    const openIds = await client.deepbook.accountOpenOrders(cfg.poolKey, cfg.managerKey);

    // Use local decoding of Order ID to get price/side (cheaper/safer)
    const existing = openIds.map((id) => {
        const { isBid, price } = client.deepbook.decodeOrderId(BigInt(id));
        return {
            id,
            side: isBid ? 'BUY' : 'SELL',
            price,
        };
    });

    const key = (s: string, p: number) => `${s}:${p.toFixed(6)}`;
    const want = new Set(desired.map((x) => key(x.side, x.price)));

    const toCancel = existing.filter((x) => !want.has(key(x.side, x.price)));
    const have = new Set(existing.map((x) => key(x.side, x.price)));
    const toPlace = desired.filter((x) => !have.has(key(x.side, x.price)));

    if (cfg.dryRun) {
        return {
            cancel: toCancel.length,
            place: toPlace.length,
            desired: desired.length,
            existing: existing.length,
            mid,
            digest: null,
        };
    }

    // Build tx
    const { Transaction } = await import('@mysten/sui/transactions');
    const tx = new Transaction();

    // Cancel first (idempotent-ish)
    for (const c of toCancel) {
        tx.add(
            client.deepbook.cancelOrder({
                poolKey: cfg.poolKey,
                balanceManagerKey: cfg.managerKey,
                orderId: c.id,
            }),
        );
    }

    // Place missing
    let clientOrderId = BigInt(Date.now());
    for (const p of toPlace) {
        tx.add(
            client.deepbook.placeLimitOrder({
                poolKey: cfg.poolKey,
                balanceManagerKey: cfg.managerKey,
                clientOrderId: clientOrderId++,
                price: p.price,
                quantity: size,
                isBid: p.side === 'BUY',
                payWithDeep: false,
            }),
        );
    }

    const res = await client.core.signAndExecuteTransaction({
        transaction: tx,
        signer: bot,
        include: { effects: true },
    });

    const digest = res.Transaction?.digest ?? null;

    return {
        cancel: toCancel.length,
        place: toPlace.length,
        desired: desired.length,
        existing: existing.length,
        mid,
        digest,
    };
}

async function botTick() {
    if (!botLast.cfg) return;
    if (botInFlight) return;
    botInFlight = true;

    try {
        const out = await reconcileAnchoredOnce(botLast.cfg);
        botLast.lastDigest = out.digest ?? null;
        botLast.lastError = null;

        emit({
            t: 'tick',
            ts: new Date().toISOString(),
            mid: out.mid,
            existing: out.existing,
            desired: out.desired,
            cancel: out.cancel,
            place: out.place,
            digest: out.digest ?? null,
        });
    } catch (e: any) {
        const msg = e?.message ?? String(e);
        botLast.lastError = msg;
        emit({ t: 'error', ts: new Date().toISOString(), msg });
    } finally {
        botInFlight = false;
    }
}

function botStart(cfg: BotConfig) {
    botStop();

    botLast.cfg = cfg;
    botLast.running = true;
    botRunning = true;

    emit({ t: 'info', ts: new Date().toISOString(), msg: `bot started pool=${cfg.poolKey}` });

    botTimer = setInterval(botTick, Math.max(1000, cfg.intervalMs));
    // run immediately
    void botTick();
}

function botStop() {
    if (botTimer) clearInterval(botTimer);
    botTimer = null;
    botRunning = false;
    botLast.running = false;
    botLast.cfg = botLast.cfg; // keep last cfg visible
    emit({ t: 'info', ts: new Date().toISOString(), msg: `bot stopped` });
}

const app = Fastify({ logger: true });

await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST'],
});

// Health
app.get('/v1/health', async (): Promise<ApiResp<{ up: true }>> => ok({ up: true }));

// Price (pool switch via query)
app.get('/v1/price', async (req: any): Promise<ApiResp<{ poolKey: string; mid: number }>> => {
    try {
        const net = getNet();
        const poolKey = (req.query?.poolKey as string) || getDefaultPoolKey();
        const address = must('SUI_ADDRESS'); // read-only address
        const client = makeDeepbookClient({ net, address });
        const mid = await client.deepbook.midPrice(poolKey);
        return ok({ poolKey, mid });
    } catch (e: any) {
        return err('PRICE_FAILED', e?.message ?? String(e));
    }
});

// Manager balances (auto coin keys should be handled in core; for now accept explicit coinKey if needed)
app.get('/v1/manager/balances', async (req: any): Promise<ApiResp<any>> => {
    try {
        const net = getNet();
        const poolKey = (req.query?.poolKey as string) || getDefaultPoolKey();
        const address = must('SUI_ADDRESS');
        const managerId = must('BALANCE_MANAGER_ID');
        const managerKey = must('BALANCE_MANAGER_KEY');

        const client = makeDeepbookClient({ net, address, managerId, managerKey });

        // “Extra safe” default: try resolve base/quote coin keys from SDK config; fallback to SUI/DBUSDC.
        const cfgAny: any = (client as any)?.deepbook?.config;
        let baseCoinKey: string | undefined;
        let quoteCoinKey: string | undefined;

        try {
            const pool: any = cfgAny?.getPool?.(poolKey);
            baseCoinKey = pool?.baseCoin ?? pool?.base_coin ?? pool?.baseCoinKey ?? pool?.base;
            quoteCoinKey = pool?.quoteCoin ?? pool?.quote_coin ?? pool?.quoteCoinKey ?? pool?.quote;
        } catch {
            // ignore
        }

        baseCoinKey = baseCoinKey ?? 'SUI';
        quoteCoinKey = quoteCoinKey ?? 'DBUSDC';

        const base = await client.deepbook.checkManagerBalance(managerKey, baseCoinKey);
        const quote = await client.deepbook.checkManagerBalance(managerKey, quoteCoinKey);

        return ok({
            poolKey,
            managerKey,
            managerId,
            coins: { baseCoinKey, quoteCoinKey },
            balances: { base, quote },
        });
    } catch (e: any) {
        return err('BALANCES_FAILED', e?.message ?? String(e));
    }
});

// Bot status
app.get('/v1/bot/status', async (): Promise<ApiResp<any>> => {
    return ok({
        running: botLast.running,
        cfg: botLast.cfg,
        lastDigest: botLast.lastDigest,
        lastError: botLast.lastError,
    });
});

// Start bot
app.post('/v1/bot/start', async (req: any): Promise<ApiResp<any>> => {
    try {
        const body = req.body ?? {};
        const cfg: BotConfig = {
            poolKey: body.poolKey ?? getDefaultPoolKey(),
            managerId: must('BALANCE_MANAGER_ID'),
            managerKey: must('BALANCE_MANAGER_KEY'),
            min: Number(body.min),
            max: Number(body.max),
            grids: Number(body.grids),
            size: Number(body.size),
            intervalMs: Number(body.intervalMs ?? 5000),
            dryRun: Boolean(body.dryRun ?? false),
        };

        if (!Number.isFinite(cfg.min) || !Number.isFinite(cfg.max)) throw new Error('min/max must be numbers');
        if (!Number.isFinite(cfg.grids) || cfg.grids < 1) throw new Error('grids must be >= 1');
        if (!Number.isFinite(cfg.size) || cfg.size <= 0) throw new Error('size must be > 0');

        // require bot creds to actually trade
        must('BOT_PRIVATE_KEY');
        must('TRADE_CAP_ID');

        botStart(cfg);
        return ok({ started: true, cfg });
    } catch (e: any) {
        return err('BOT_START_FAILED', e?.message ?? String(e));
    }
});

// Stop bot
app.post('/v1/bot/stop', async (): Promise<ApiResp<any>> => {
    botStop();
    return ok({ stopped: true });
});

// SSE logs
app.get('/v1/bot/events', async (req, reply) => {
    reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    const send = (line: string) => reply.raw.write(line);
    clients.add(send);

    // hello + heartbeat
    send(`data: ${JSON.stringify({ t: 'info', ts: new Date().toISOString(), msg: 'connected' })}\n\n`);
    const hb = setInterval(() => send(`data: ${JSON.stringify({ t: 'info', ts: new Date().toISOString(), msg: 'hb' })}\n\n`), 25000);

    req.raw.on('close', () => {
        clearInterval(hb);
        clients.delete(send);
    });
});

const port = Number(process.env.API_PORT ?? 8787);
await app.listen({ port, host: '0.0.0.0' });

emit({ t: 'info', ts: new Date().toISOString(), msg: `api up on :${port}` });
