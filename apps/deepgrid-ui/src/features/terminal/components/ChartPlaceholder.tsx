import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export function ChartPlaceholder() {
    return (
        <Card className="h-[520px]">
            <CardHeader>
                <CardTitle>Chart</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
                Placeholder (TradingView later)
            </CardContent>
        </Card>
    );
}
