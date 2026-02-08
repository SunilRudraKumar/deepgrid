# Grid Bot Implementation Plan

## Overview

Build an automated grid trading bot that runs 24/7 on a backend server, integrated with the existing DeepGrid UI.

## Architecture Decision

### Why Backend Service (Not On-Chain)?

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **On-Chain Move** | Trustless, decentralized | Complex, gas costs per check, limited flexibility | ❌ Not practical for grid trading |
| **Browser-Based** | Simple, no server | Dies when tab closes | ❌ User rejected |
| **Backend Service** | Runs 24/7, flexible logic, easy to integrate | Needs server, holds private key | ✅ **Recommended** |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DeepGrid System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐         ┌─────────────────────────────┐   │
│  │   Next.js UI    │◄───────►│      Bot API Server         │   │
│  │  (Vercel/Web)   │  REST   │    (Node.js + Express)      │   │
│  │                 │         │                             │   │
│  │ - Start/Stop Bot│         │ - Grid Strategy Engine      │   │
│  │ - View Status   │         │ - Order Monitoring Loop     │   │
│  │ - Set Params    │         │ - DeepBook SDK Integration  │   │
│  │ - See P&L       │         │ - Wallet Key Management     │   │
│  └─────────────────┘         └──────────────┬──────────────┘   │
│                                             │                   │
│                                             ▼                   │
│                              ┌─────────────────────────────┐   │
│                              │      Sui Blockchain         │   │
│                              │    (DeepBook V3 Pools)      │   │
│                              └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Grid Bot Logic

### How Grid Trading Works

```
Upper Price: $4.50  ────────────────────────  SELL zone
                    │ Grid 5: SELL @ $4.50 │
                    │ Grid 4: SELL @ $4.25 │
Mid Price: $4.00    ├──────────────────────┤
                    │ Grid 3: BUY  @ $3.75 │
                    │ Grid 2: BUY  @ $3.50 │
Lower Price: $3.50  │ Grid 1: BUY  @ $3.25 │
                    ────────────────────────  BUY zone
```

### Bot Execution Flow

```
1. User sets: Lower=$3.50, Upper=$4.50, Grids=10, Capital=$1000
2. Bot calculates grid levels: $3.50, $3.60, $3.70... $4.50
3. Bot places initial limit orders at each level
4. Bot enters monitoring loop:
   ├─ Check if any orders filled (every 5-10 seconds)
   ├─ If BUY filled at $3.70 → Place SELL at $3.80 (one grid up)
   ├─ If SELL filled at $4.00 → Place BUY at $3.90 (one grid down)
   └─ Profit = grid_spacing × quantity per round-trip
5. Loop continues until user stops bot
```

---

## Technical Implementation

### Phase 1: Bot Service (New Package)

```
deepgrid-v2/
├── packages/
│   └── bot/                    # NEW: Bot service
│       ├── src/
│       │   ├── index.ts        # Entry point
│       │   ├── grid-engine.ts  # Grid calculation logic
│       │   ├── order-manager.ts# Place/cancel orders
│       │   ├── monitor.ts      # Order fill detection
│       │   ├── wallet.ts       # Key management (secure)
│       │   └── api/
│       │       ├── server.ts   # Express API
│       │       └── routes.ts   # REST endpoints
│       ├── package.json
│       └── .env.example        # BOT_PRIVATE_KEY, etc.
```

### Phase 2: API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/bot/start` | POST | Start bot with grid params |
| `/bot/stop` | POST | Stop bot, cancel all orders |
| `/bot/status` | GET | Get current bot state, P&L |
| `/bot/config` | GET/PUT | Get/update grid configuration |
| `/bot/orders` | GET | List all active grid orders |
| `/bot/history` | GET | Trade history and profits |

### Phase 3: UI Integration

Add to existing Next.js app:
- **Grid Config Form**: Set upper/lower price, grid count, capital
- **Start/Stop Button**: Calls bot API
- **Live Status Panel**: Shows active orders, filled count, P&L
- **Grid Visualization**: Chart overlay showing grid levels

---

## Key Technical Decisions

### 1. Wallet Key Management (Critical Security)

Options:
- **A) Server-side private key** (simplest, less secure)
- **B) Hardware wallet via CLI** (more secure, complex)
- **C) Sponsored transactions** (requires infrastructure)

**Recommendation**: Start with A, encrypt key with user password.

### 2. Order Fill Detection

Options:
- **Polling**: Check `account_open_orders` every 5-10 seconds
- **Events**: Subscribe to on-chain events (complex)
- **Indexer**: Query DeepBook indexer for trade history

**Recommendation**: Polling with `account_open_orders` + compare with local state.

### 3. Deployment Options

| Option | Cost | Complexity | Uptime |
|--------|------|------------|--------|
| **Local machine** | Free | Low | Poor (sleeps) |
| **Railway/Render** | $5-10/mo | Low | Good |
| **VPS (DigitalOcean)** | $5/mo | Medium | Good |
| **AWS Lambda** | Pay-per-use | High | Good |

**Recommendation**: Railway or Render for easy deployment.

---

## Implementation Checklist

### Phase 1: Core Bot Engine
- [ ] Create `packages/bot` with TypeScript setup
- [ ] Implement grid calculation (price levels, order sizes)
- [ ] Implement order placement using existing `limit-order.ts`
- [ ] Implement order monitoring loop
- [ ] Implement order fill detection + re-placement logic
- [ ] Add P&L tracking

### Phase 2: API Server
- [ ] Create Express server with REST endpoints
- [ ] Implement start/stop/status endpoints
- [ ] Add authentication (API key or JWT)
- [ ] Add WebSocket for real-time updates (optional)

### Phase 3: UI Integration
- [ ] Create Grid Configuration form component
- [ ] Create Bot Control panel (start/stop/status)
- [ ] Add grid visualization overlay on chart
- [ ] Display real-time P&L and trade count

### Phase 4: Security & Deployment
- [ ] Implement encrypted key storage
- [ ] Add rate limiting to API
- [ ] Create deployment scripts for Railway/Render
- [ ] Add monitoring and alerting

---

## Questions Before Proceeding

1. **Private key handling**: Are you okay storing the bot's private key on a server? (Alternative: create a "bot wallet" with limited funds)

2. **Hosting preference**: Where do you want to run the bot?
   - Your own machine (free but not 24/7)
   - Railway/Render (easy, ~$5-10/mo)
   - VPS (more control, ~$5/mo)

3. **Capital per grid**: Fixed amount (e.g., $100 per level) or dynamic based on total capital?

4. **Grid levels**: How many default grids? (Common: 5, 10, 20)

---

## Estimated Effort

| Phase | Time Estimate |
|-------|--------------|
| Phase 1: Core Bot | 2-3 days |
| Phase 2: API Server | 1 day |
| Phase 3: UI Integration | 1-2 days |
| Phase 4: Security + Deploy | 1 day |
| **Total** | **5-7 days** |

---

## Next Steps

1. Review this plan
2. Answer the questions above
3. Run `/create` to start Phase 1 implementation
