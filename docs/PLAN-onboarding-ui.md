# PLAN-onboarding-ui

## Goal
Implement a modular Onboarding UI for the DeepGrid trading terminal to guide users through connecting a wallet, creating a trading account, and funding it. This system needs to be integrated into the existing `TradeLayout` and switchable based on the user's account state.

## Core Architecture

### State Machine (UI-only for MVP)
- `DISCONNECTED`: Wallet not connected from dApp Kit.
- `NO_TRADING_ACCOUNT`: Wallet connected, but no trading account on-chain.
- `ACCOUNT_READY_NO_FUNDS`: Trading account exists, but balances are 0.
- `READY`: Account funded and ready to trade.

### Component Architecture
1.  **OnboardingGate**: The controller component that determines render state (Onboarding vs Chart).
2.  **OnboardingPanel**: The main container for the onboarding flow.
    - **Header**: Shows market and environment (e.g., Testnet).
    - **Stepper**: Visual progress indicator (Connect -> Create -> Fund -> Confirm).
    - **Body**: Renders the specific card for the current state.
3.  **Cards**: Modular steps.
    - `CreateAccountCard`
    - `DepositCard`
    - `ConfirmCard`
    - `ReadyCard`
4.  **Layout Integration**:
    - Replace `ChartPanel` in `TradeTerminal` with `OnboardingGate` when not in `READY` (or purely for the gate to decide).
    - `WalletSidebar` integration (show placeholders until ready).

## Task Breakdown

### Phase 1: scaffolding & Primitives
- [ ] Create `components/onboarding` directory.
- [ ] Create `components/onboarding/cards` directory.
- [ ] Implement shared UI primitives if missing (StatPill, StatusPill).

### Phase 2: Core Components
- [ ] Implement `Stepper.tsx` (Visual progress).
- [ ] Implement `CreateAccountCard.tsx` (Connect/Create modes).
- [ ] Implement `DepositCard.tsx` (Asset selection, input).
- [ ] Implement `ConfirmCard.tsx` (Checklist/Status).
- [ ] Implement `ReadyCard.tsx` (Success state).

### Phase 3: Integration
- [ ] Implement `OnboardingPanel.tsx` (Layout + switching logic).
- [ ] Implement `OnboardingGate.tsx` (State management mock).
- [ ] Update `TradeTerminal.tsx` to conditionally render `OnboardingGate` instead of `ChartPanel` based on state (or have Gate wrap/replace Chart).

## User Provided Specs
- **Mock Mode**: The user provided code includes mock state toggles (`Mock: Disconnected`, `Mock: Ready`) which should be preserved for development.
- **Styling**: Must match existing "pro terminal" aesthetic (zinc/slate/black palette, colored borders for status).

## Agent Assignments
- **Frontend Specialist**: To implement the React components and styling.
- **Orchestrator**: To integrate into the main terminal layout.

## Verification
- **Manual Test**: Toggle through all states using the mock buttons in `OnboardingPanel`.
- **Visual Check**: Ensure Onboarding UI fits perfectly into the Left/Large panel area of the 3-column grid.
