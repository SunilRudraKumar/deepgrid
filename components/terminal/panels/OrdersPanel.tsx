'use client';

import React from 'react';
import { Panel } from '../ui/Panel';
import { Tabs } from '../ui/Tabs';
import { useOpenOrders } from '@/lib/hooks/useOpenOrders';
import { useManagerId } from '@/lib/hooks/useManagerId';
import { usePoolSelector } from '@/lib/context/PoolSelectorContext';

type OrdersTab = 'open' | 'history' | 'trades';

interface OrdersPanelProps {
    managerId?: string | null;
}

export default function OrdersPanel({ managerId: propManagerId }: OrdersPanelProps) {
    const [tab, setTab] = React.useState<OrdersTab>('open');
    const { managerId: hookManagerId } = useManagerId();
    const managerId = propManagerId ?? hookManagerId;
    const { selectedPool } = usePoolSelector();

    const { data: orders, isLoading } = useOpenOrders(managerId);

    const renderEmptyState = (message: string) => (
        <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-6 text-center">
            <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-600">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </div>
                <div className="text-sm text-zinc-500 p-2">{message}</div>
            </div>
        </div>
    );

    const renderOpenOrders = () => {
        if (isLoading) {
            return renderEmptyState('Loading orders...');
        }

        if (!orders || orders.length === 0) {
            return renderEmptyState('No open orders yet.');
        }

        return (
            <div className="flex-1 min-h-0 overflow-auto">
                {orders.map((order) => (
                    <div
                        key={order.orderId}
                        className="grid grid-cols-6 gap-2 px-3 py-2 text-xs border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                        <div className="text-zinc-400">{order.poolKey}</div>
                        <div className={order.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}>
                            {order.side.toUpperCase()}
                        </div>
                        <div className="text-right text-zinc-300">
                            {order.price > 0 ? order.price.toFixed(4) : '—'}
                        </div>
                        <div className="text-right text-zinc-300">
                            {order.quantity > 0 ? order.quantity.toFixed(4) : '—'}
                        </div>
                        <div className="text-right text-zinc-500">
                            {order.filled > 0 ? order.filled.toFixed(4) : '0'}
                        </div>
                        <div className="text-right">
                            <button
                                className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 rounded hover:bg-red-500/10 transition-colors"
                                onClick={() => {
                                    console.log('Cancel order:', order.orderId);
                                    // TODO: Implement cancel order
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Panel
            title={
                <Tabs
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: 'open', label: `Open Orders${orders?.length ? ` (${orders.length})` : ''}` },
                        { value: 'history', label: 'Order History' },
                        { value: 'trades', label: 'Trade History' },
                    ]}
                />
            }
        >
            <div className="h-full min-h-0 flex flex-col">
                <div className="grid grid-cols-6 gap-2 border-b border-white/5 px-3 py-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider shrink-0 bg-[#0f141b]">
                    <div>Market</div>
                    <div>Side</div>
                    <div className="text-right">Price</div>
                    <div className="text-right">Quantity</div>
                    <div className="text-right">Filled</div>
                    <div className="text-right">Actions</div>
                </div>

                {tab === 'open' && renderOpenOrders()}
                {tab === 'history' && renderEmptyState('No order history yet.')}
                {tab === 'trades' && renderEmptyState('No trades yet.')}
            </div>
        </Panel>
    );
}
