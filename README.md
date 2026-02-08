# DeepGrid v2

A decentralized trading terminal and bot platform built on Sui and DeepBook v3.

## Features

### Trading Terminal
- **Spot Trading**: Limit and market orders on DeepBook v3 pools.
- **Charts**: Real-time candlestick charts with technical indicators.
- **Order Management**: Open orders, order history, and trade history.
- **Wallet Integration**: Seamless connection with Sui wallets via dApp Kit.

### Automated Trading Bots
- **Grid Trading Bot**: 
  - Automates buy low / sell high strategies within a price range.
  - **Single Asset Entry**: Start bots with only one asset (e.g., USDC) via auto-swap.
  - **Real-time Visualization**: View grid levels directly on the price chart.
  - **Performance Tracking**: Track realized and unrealized PnL.
- **DCA Bot**: (Coming Soon) Dollar Cost Averaging strategies.

### Dashboard & Analytics
- **Bot Dashboard**: Manage all active bots from a central interface.
- **Portfolio**: (Components in progress) Track comprehensive asset performance.
- **Leaderboard**: (Components in progress) Compare strategies with other traders.

## Project Structure

```
deepgrid-v2/
├── app/                    # Next.js App Router pages
│   ├── spot/               # Spot trading terminal
│   ├── bots/               # Bot creation and management
│   ├── dashboard/          # User dashboard
│   ├── portfolio/          # Portfolio analytics
│   └── ...
├── components/             # React components
│   ├── terminal/           # Trading terminal components (charts, order book)
│   ├── grid-bot/           # Grid bot specific components
│   ├── dashboard/          # Dashboard widgets
│   └── ui/                 # Reusable UI elements
├── lib/                    # Core logic and utilities
│   ├── deepbook/           # DeepBook SDK integration and order builders
│   ├── hooks/              # Custom React hooks (Sui interaction, state)
│   ├── prisma/             # Database client
│   └── ...
└── public/                 # Static assets
```

## Getting Started

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```

2.  **Run development server**:
    ```bash
    pnpm dev
    ```

3.  **Build for production**:
    ```bash
    pnpm build
    ```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Blockchain**: Sui (Move)
- **DeFi Protocol**: DeepBook v3
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Prisma)
