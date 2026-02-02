export interface GridParams {
    minPrice: number;
    maxPrice: number;
    levels: number;
    currentPrice: number;
    totalInvestments: number;
    accountCap?: string;
}

export interface GridOrder {
    price: number;
    side: 'bid' | 'ask';
    quantity: number;
}

export function calculateGridOrders(params: GridParams): GridOrder[] {
    const { minPrice, maxPrice, levels } = params;
    const orders: GridOrder[] = [];

    if (levels <= 0 || maxPrice <= minPrice) {
        return [];
    }

    const step = (maxPrice - minPrice) / (levels - 1);

    for (let i = 0; i < params.levels; i++) {
        const price = params.minPrice + (i * step);
        const isBid = price < params.currentPrice;

        orders.push({
            price,
            side: isBid ? 'bid' : 'ask',
            quantity: Number(((params.totalInvestments / params.levels) / price).toFixed(2))
        });
    }

    return orders;
}