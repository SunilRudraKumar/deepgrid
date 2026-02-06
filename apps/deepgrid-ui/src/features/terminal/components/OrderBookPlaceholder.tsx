import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export function OrderBookPlaceholder() {
    return (
        <Card className="h-[260px]">
            <CardHeader>
                <CardTitle>Order Book</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
                Placeholder (on-chain orderbook later)
            </CardContent>
        </Card>
    );
}
