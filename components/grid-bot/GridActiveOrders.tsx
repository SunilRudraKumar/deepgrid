
'use client';

import React from 'react';
import { fetchOpenOrderIds, fetchOrderDetails, type OpenOrder } from '@/lib/deepbook/orders/fetch-orders';
import { type DeepbookNetwork } from '@/lib/deepbook/indexer';
import { cn } from '@/lib/utils';
import { usePolling } from '@/lib/hooks/usePolling';

interface GridActiveOrdersProps {
    managerId: string;
    poolKey: string;
    network: DeepbookNetwork;
}

interface OrderDetail {
    orderId: string;
    price: number;
    quantity: number;
    side: 'buy' | 'sell';
    filled: number;
}

export default function GridActiveOrders({ managerId, poolKey, network }: GridActiveOrdersProps) {
    const [orders, setOrders] = React.useState<OrderDetail[]>([]);
    const [loading, setLoading] = React.useState(false);

    const fetchOrders = React.useCallback(async () => {
        if (!managerId) return null;
        try {
            const ids = await fetchOpenOrderIds(managerId, poolKey, network);
            if (ids.length === 0) {
                return [];
            }

            // Limit to 50 concurrent requests
            const details = await Promise.all(
                ids.slice(0, 50).map(id => fetchOrderDetails(id, poolKey, network))
            );

            return details.filter((o): o is OrderDetail => o !== null);
        } catch (e) {
            console.error('Error fetching orders:', e);
            return [];
        }
    }, [managerId, poolKey, network]);

    const poll = usePolling(fetchOrders, {
        intervalMs: 3000,
        enabled: !!managerId
    });

    React.useEffect(() => {
        if (poll.data) {
            setOrders(poll.data.sort((a, b) => b.price - a.price));
        }
    }, [poll.data]);

    if (!managerId) return null;

    return (
        <div className="rounded-lg border border-white/10 bg-[#0f141b] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                <span className="text-sm font-medium text-white">Active Grid Orders</span>
                <div className="flex gap-2 text-xs">
                    <span className="text-white/40">
                        {orders.length} Open
                    </span>
                    {poll.loading && <span className="text-blue-400 animate-pulse">Updating...</span>}
                </div>
            </div>

            <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-xs text-white/40 sticky top-0 backdrop-blur-md">
                        <tr>
                            <th className="px-4 py-2 font-medium">Side</th>
                            <th className="px-4 py-2 font-medium text-right">Price</th>
                            <th className="px-4 py-2 font-medium text-right">Size</th>
                            <th className="px-4 py-2 font-medium text-right">Filled</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-white/30 text-xs italic">
                                    No active orders found
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.orderId} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-2">
                                        <span className={cn(
                                            "inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                                            order.side === 'buy'
                                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                                        )}>
                                            {order.side}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono text-white/90">
                                        {order.price.toFixed(4)}
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono text-white/70">
                                        {order.quantity.toFixed(4)}
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono text-white/50">
                                        {order.filled > 0 ? `${(order.filled / order.quantity * 100).toFixed(1)}%` : '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
