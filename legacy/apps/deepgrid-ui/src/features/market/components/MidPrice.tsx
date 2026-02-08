import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";

type PriceResp = { poolKey: string; mid: number };

export function MidPrice({ poolKey = "SUI_DBUSDC" }: { poolKey?: string }) {
    const { data, isPending, error } = useQuery({
        queryKey: ["midPrice", poolKey],
        queryFn: () => apiGet<PriceResp>("/v1/price", { poolKey }),
        refetchInterval: 5000,
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mid Price</CardTitle>
                <CardDescription>{poolKey}</CardDescription>
            </CardHeader>
            <CardContent>
                {error ? (
                    <div className="text-destructive-foreground">{(error as Error).message}</div>
                ) : isPending ? (
                    <div className="text-muted-foreground">Loading...</div>
                ) : (
                    <div className="text-xl font-semibold">{data?.mid ?? 0}</div>
                )}
            </CardContent>
        </Card>
    );
}
