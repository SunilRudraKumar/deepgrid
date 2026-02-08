// components/grid-bot/GridLevelsTable.tsx
// Table showing all grid levels with price, side, size

'use client';

import { cn } from '@/lib/utils';
import type { GridOrder } from '@/lib/grid-bot';

interface GridLevelsTableProps {
    orders: GridOrder[];
    pivotIndex: number;
    pivotPrice: number;
}

export default function GridLevelsTable({ orders, pivotIndex, pivotPrice }: GridLevelsTableProps) {
    return (
        <div className="rounded-lg border border-white/10 bg-[#0f141b] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-sm font-medium text-white">Grid Levels Preview</span>
                <span className="text-xs text-white/40">
                    Pivot at ${pivotPrice.toFixed(4)}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-white/40 border-b border-white/5">
                            <th className="px-4 py-2 text-left font-medium">Level</th>
                            <th className="px-4 py-2 text-right font-medium">Price</th>
                            <th className="px-4 py-2 text-center font-medium">Side</th>
                            <th className="px-4 py-2 text-right font-medium">Size</th>
                            <th className="px-4 py-2 text-right font-medium">Value (USDC)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order, i) => (
                            <GridLevelRow
                                key={i}
                                index={i}
                                order={order}
                                isPivot={i === pivotIndex}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function GridLevelRow({
    index,
    order,
    isPivot
}: {
    index: number;
    order: GridOrder;
    isPivot: boolean;
}) {
    return (
        <tr className={cn(
            'border-b border-white/5 hover:bg-white/5',
            isPivot && 'bg-blue-500/10'
        )}>
            <td className="px-4 py-2 text-white/60">{index + 1}</td>
            <td className="px-4 py-2 text-right font-mono text-white">
                ${order.price.toFixed(4)}
            </td>
            <td className="px-4 py-2 text-center">
                <span className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-medium',
                    order.side === 'BUY'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                )}>
                    {order.side}
                </span>
            </td>
            <td className="px-4 py-2 text-right font-mono text-white/80">
                {order.size.toFixed(4)}
            </td>
            <td className="px-4 py-2 text-right font-mono text-white/60">
                ${(order.size * order.price).toFixed(2)}
            </td>
        </tr>
    );
}
