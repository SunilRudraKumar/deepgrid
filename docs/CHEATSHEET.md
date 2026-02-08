# DeepGrid V2 - Function Cheat Sheet

## Overview
This document maps all key functions, their flow, and where data is stored.

---

## 🔧 Core Libraries Used

| Package | Purpose |
|---------|---------|
| `@mysten/dapp-kit-react` | Wallet connection, transaction signing |
| `@mysten/sui/grpc` | gRPC client for Sui RPC calls |
| `@mysten/deepbook-v3` | DeepBook SDK (package IDs, coins, extensions) |
| `@tanstack/react-query` | Data fetching and caching |

---

## 📁 Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        app/layout.tsx                           │
│   └─ ClientProviders → Providers                                │
│       ├─ QueryClientProvider                                    │
│       ├─ DAppKitProvider                                        │
│       └─ PoolSelectorProvider                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       TopNav.tsx                                │
│   ├─ PoolSelector       → Select trading pool                   │
│   ├─ PoolBalanceDisplay → Show wallet balances for pool tokens  │
│   └─ ConnectButton      → Wallet connection                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OnboardingGate.tsx                          │
│   ├─ useCurrentAccount()      → Get connected wallet            │
│   ├─ useDAppKit()             → Sign transactions               │
│   ├─ checkTradingAccount()    → Check for Balance Manager       │
│   ├─ createTradingAccountTransaction() → Build TX               │
│   ├─ fetchAccountBalances()   → Get trading account balances    │
│   └─ buildDepositTransaction() → Build deposit TX               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎱 Pool System (NEW)

### Add a New Pool (`lib/config/pools.ts`)

```ts
export const POOLS: PoolConfig[] = [
    { id: 'SUI_USDC', name: 'SUI / USDC', baseToken: 'SUI', quoteToken: 'USDC' },
    { id: 'SUI_DEEP', name: 'SUI / DEEP', baseToken: 'SUI', quoteToken: 'DEEP' },
    // Add new pools here:
    { id: 'DEEP_USDC', name: 'DEEP / USDC', baseToken: 'DEEP', quoteToken: 'USDC' },
];
```

### Use Pool Context (Any Component)

```ts
import { usePoolSelector } from '@/lib/context/PoolSelectorContext';

function MyComponent() {
    const { selectedPool, setSelectedPoolId } = usePoolSelector();
    // selectedPool.baseToken → 'SUI'
    // selectedPool.quoteToken → 'USDC'
}
```

### Pool Files

| File | Purpose |
|------|---------|
| `lib/config/pools.ts` | Pool definitions (add new pools here) |
| `lib/context/PoolSelectorContext.tsx` | React context for selected pool |
| `components/terminal/nav/PoolSelector.tsx` | Dropdown UI component |
| `components/terminal/nav/PoolBalanceDisplay.tsx` | Balance display for pool tokens |

---

## 📊 Live Chart System (NEW)

### Architecture

```
PoolSelectorContext (selected pool)
         │
         ▼
┌─────────────────────────────────────────────┐
│              ChartPanel.tsx                  │
│  ├─ usePolling() → getSummary()  (24h stats)│
│  ├─ usePolling() → getOhlcv()    (candles)  │
│  └─ DeepbookCandleChart          (render)   │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│        lib/deepbook/indexer.ts               │
│  DeepBook Indexer API Client                 │
│  - getOhlcv()     → /ohclv/:pool_name       │
│  - getOrderbook() → /orderbook/:pool_name   │
│  - getTrades()    → /trades/:pool_name      │
│  - getSummary()   → /summary                │
└─────────────────────────────────────────────┘
```

### Indexer API (`lib/deepbook/indexer.ts`)

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `getOhlcv()` | `/ohclv/:pool_name` | OHLCV candles |
| `getOrderbook()` | `/orderbook/:pool_name` | Order book L2 |
| `getTrades()` | `/trades/:pool_name` | Recent trades |
| `getSummary()` | `/summary` | 24h stats for all pools |
| `getPools()` | `/get_pools` | Available pools |

### Polling Hook (`lib/hooks/usePolling.ts`)

```ts
import { usePolling } from '@/lib/hooks/usePolling';

const { data, error, loading, refetch } = usePolling(
    () => getOhlcv({ network: 'mainnet', pool: 'SUI_USDC', interval: '15m' }),
    { intervalMs: 15_000, enabled: true }
);
```

### Chart Component (`components/terminal/charts/DeepbookCandleChart.tsx`)

```tsx
import { DeepbookCandleChart } from '@/components/terminal/charts';

<DeepbookCandleChart
    candles={ohlcvData.candles}  // [time, open, high, low, close, volume][]
    height={420}
    priceLines={[1.23, 1.45]}    // Optional grid levels
/>
```

### Indexer Base URLs

| Network | URL |
|---------|-----|
| Mainnet | `https://deepbook-indexer.mainnet.mystenlabs.com` |
| Testnet | `https://deepbook-indexer.testnet.mystenlabs.com` |

### Files

| File | Purpose |
|------|---------|
| `lib/deepbook/indexer.ts` | API client for DeepBook indexer |
| `lib/hooks/usePolling.ts` | Generic polling hook |
| `components/terminal/charts/DeepbookCandleChart.tsx` | Candlestick chart |
| `components/terminal/panels/ChartPanel.tsx` | Live chart panel |

---

## 🔑 Function Reference

### 1. Configuration (`src/config/dapp-kit.ts`)

| Function | Purpose |
|----------|---------|
| `createDAppKit()` | Initialize dApp Kit with network config |
| `createClient(network)` | Create `SuiGrpcClient` for specified network |

**Data:** Network URLs stored in `GRPC_URLS` constant.

---

### 2. Account Check (`lib/features/onboarding/check-account.ts`)

```ts
checkTradingAccount(walletAddress: string, network?: string)
→ { exists: boolean, accountIds?: string[] }
```

**Flow:**
1. Create `SuiGrpcClient` with DeepBook extension
2. Call `client.deepbook.getBalanceManagerIds(walletAddress)`
3. Return whether Balance Managers exist

---

### 3. Account Creation (`lib/features/deepbook/create-account.ts`)

```ts
createTradingAccountTransaction(walletAddress: string, network?: string)
→ Transaction
```

**Flow:**
1. Create `Transaction` object
2. Add `balance_manager::new` Move call
3. Add `balance_manager::register_balance_manager` call
4. Add `transfer::public_share_object` call
5. Return unsigned transaction

---

### 4. Deposit Funds (`lib/features/deepbook/deposit.ts`)

```ts
buildDepositTransaction({
    walletAddress: string,
    managerId: string,      // Balance Manager ID
    coinKey: string,        // 'SUI', 'USDC', 'DEEP'
    amount: number,         // Human units (e.g., 10.5)
    network?: string
}) → Transaction
```

**Flow:**
1. Get coin type and scalar from DeepBook coin definitions
2. Convert human amount to base units (amount × scalar)
3. Use `coinWithBalance()` for automatic coin selection
4. Add `balance_manager::deposit` Move call
5. Return unsigned transaction

**To Deposit:** In DepositCard, calls `dAppKit.signAndExecuteTransaction({ transaction: tx })`

---

### 5. Place Orders (`lib/deepbook/orders/`)

#### Market Order

```ts
import { buildMarketOrderTransaction } from '@/lib/deepbook/orders';

const tx = await buildMarketOrderTransaction({
    walletAddress: '0x...',
    managerId: '0x...',
    poolKey: 'SUI_USDC',
    quantity: 10,
    side: 'buy',
    payWithDeep: true,
    network: 'mainnet',
});
await dAppKit.signAndExecuteTransaction({ transaction: tx });
```

#### Limit Order

```ts
import { buildLimitOrderTransaction } from '@/lib/deepbook/orders';

const tx = await buildLimitOrderTransaction({
    walletAddress: '0x...',
    managerId: '0x...',
    poolKey: 'SUI_USDC',
    quantity: 10,
    price: 1.05,
    side: 'buy',
    orderType: 'post_only',  // Optional: 'no_restriction', 'immediate_or_cancel', 'fill_or_kill'
    expiration: 0,           // 0 = no expiration
    payWithDeep: true,
    network: 'mainnet',
});
await dAppKit.signAndExecuteTransaction({ transaction: tx });
```

#### React Hook

```tsx
import { useTradeOrder } from '@/lib/hooks/useTradeOrder';

const { placeMarketOrder, placeLimitOrder, isLoading, error } = useTradeOrder({ managerId });

// Market order
const result = await placeMarketOrder({ poolKey: 'SUI_USDC', quantity: 10, side: 'buy' });

// Limit order
const result = await placeLimitOrder({ poolKey: 'SUI_USDC', quantity: 10, price: 1.05, side: 'buy' });
```

#### Order Files

| File | Purpose |
|------|---------|
| `lib/deepbook/orders/types.ts` | Type definitions (OrderSide, OrderType, etc.) |
| `lib/deepbook/orders/config.ts` | Pool IDs, network config |
| `lib/deepbook/orders/market-order.ts` | Market order transaction builder |
| `lib/deepbook/orders/limit-order.ts` | Limit order transaction builder |
| `lib/hooks/useTradeOrder.ts` | React hook for order execution |

#### Add New Pool

```ts
// lib/deepbook/orders/config.ts
export const POOL_IDS: Record<Network, Record<string, string>> = {
    mainnet: {
        SUI_USDC: '0xe05dafb5...',
        SUI_DEEP: '0xb663828d...',
        // Add new pool:
        NEW_POOL: '0x...',
    },
};
```

---

### 5. Balance Fetching - Trading Account (`lib/features/deepbook/balance.ts`)

```ts
fetchAccountBalances(managerId: string, network?: string)
→ BalanceResult[]
```

**Flow:**
1. For each coin (DEEP, SUI, USDC, USDT, WETH):
   - Build `balance_manager::balance` Move call
   - Simulate transaction via `client.simulateTransaction()`
   - Parse BCS-encoded u64 result
   - Adjust by coin scalar (decimals)

---

### 6. Balance Fetching - Main Wallet (`lib/hooks/useWalletBalances.ts`)

```ts
useWalletBalances()
→ { data: WalletBalance[], isLoading: boolean, ... }
```

**Flow:**
1. Get current account via `useCurrentAccount()`
2. Get client via `useCurrentClient()`
3. Call `client.core.listBalances({ owner })`
4. Map coin types to known symbols using DeepBook coin definitions
5. Return normalized balances (cached 10s)

---

## 🎯 Component Flow

### OnboardingGate States

```
DISCONNECTED → FETCHING_ACCOUNT → NO_TRADING_ACCOUNT → READY
                                         │                │
                                         ▼                ▼
                                      DEPOSIT ────────────┘
```

| State | Trigger | Data Source |
|-------|---------|-------------|
| `DISCONNECTED` | No wallet connected | - |
| `FETCHING_ACCOUNT` | Wallet connected | `checkTradingAccount()` |
| `NO_TRADING_ACCOUNT` | No Balance Manager found | - |
| `READY` | Balance Manager exists | `fetchAccountBalances()` |
| `DEPOSIT` | User clicks "Deposit" | `useWalletBalances()` |

---

## 📊 Data Storage

| Data | Location | Persistence |
|------|----------|-------------|
| Wallet connection | DAppKitProvider state | Session (localStorage) |
| Selected pool | PoolSelectorContext | Runtime (React state) |
| Balance Manager IDs | On-chain (Sui) | Permanent |
| Trading balances | On-chain (Sui) | Permanent |
| Wallet balances | React Query cache | Runtime (10s refetch) |
| Network config | `NEXT_PUBLIC_SUI_NETWORK` | .env.local |

---

## 🔗 Import Paths

```ts
// Wallet hooks
import { useCurrentAccount, useDAppKit, useCurrentClient } from '@mysten/dapp-kit-react';

// gRPC Client
import { SuiGrpcClient } from '@mysten/sui/grpc';

// Transactions
import { Transaction, coinWithBalance } from '@mysten/sui/transactions';

// DeepBook
import { deepbook, testnetPackageIds, testnetCoins, mainnetCoins } from '@mysten/deepbook-v3';

// React Query
import { useQuery } from '@tanstack/react-query';

// Pool System
import { POOLS, getPoolById } from '@/lib/config/pools';
import { usePoolSelector } from '@/lib/context/PoolSelectorContext';
import { useWalletBalances } from '@/lib/hooks/useWalletBalances';
```

---

## 📂 Key File Locations

| Purpose | Path |
|---------|------|
| Pool config | `lib/config/pools.ts` |
| Pool context | `lib/context/PoolSelectorContext.tsx` |
| Wallet balances hook | `lib/hooks/useWalletBalances.ts` |
| Manager balances hook | `lib/hooks/useManagerBalances.ts` |
| Trading account check | `lib/features/onboarding/check-account.ts` |
| Account creation | `lib/features/deepbook/create-account.ts` |
| Deposit transaction | `lib/features/deepbook/deposit.ts` |
| Trading balances | `lib/features/deepbook/balance.ts` |
| Market orders | `lib/deepbook/orders/market-order.ts` |
| Limit orders | `lib/deepbook/orders/limit-order.ts` |
| Order config | `lib/deepbook/orders/config.ts` |
| Navbar components | `components/terminal/nav/` |
| Onboarding flow | `components/onboarding/` |

---

## 🚧 Improvements & Known Issues

### Order Requirements (Important!)

DeepBook pools have **minimum size** and **lot size** requirements:

| Pool | min_size | lot_size | Meaning |
|------|----------|----------|---------|
| SUI_USDC | 1 SUI | 0.1 SUI | Min 1 SUI per order, increments of 0.1 |
| DEEP_SUI | 10 DEEP | 1 DEEP | Min 10 DEEP per order, increments of 1 |
| DEEP_USDC | 10 DEEP | 1 DEEP | Min 10 DEEP per order, increments of 1 |

**Current:** Validation happens in order builders (`market-order.ts`, `limit-order.ts`).

**TODO:**
- [ ] Add UI validation to show min order size before submission
- [ ] Fetch pool params dynamically from indexer instead of hardcoding
- [ ] Display lot_size to user so they enter valid quantities

### Pay with DEEP
- `payWithDeep: false` is default since most users don't have DEEP deposited
- If user has DEEP in Balance Manager, they can opt-in to pay fees with DEEP

### Balance Display
- Spot trading now shows **Balance Manager** balances, not wallet balances
- Uses `useManagerBalances` hook (fetches from chain via simulation)

