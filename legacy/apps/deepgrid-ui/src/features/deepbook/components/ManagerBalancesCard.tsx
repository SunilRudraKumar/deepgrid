import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { BASE_COIN_KEY, QUOTE_COIN_KEY } from "../constants";
import { useManagerBalances } from "../hooks/useManagerBalances";

export function ManagerBalancesCard({ managerId }: { managerId: string | null }) {
    const { data, isPending, error } = useManagerBalances(managerId);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manager Balances</CardTitle>
                <CardDescription>Read-only (on-chain)</CardDescription>
            </CardHeader>
            <CardContent>
                {!managerId ? (
                    <div className="text-muted-foreground text-sm">No manager selected</div>
                ) : error ? (
                    <div className="text-sm">{(error as Error).message}</div>
                ) : isPending ? (
                    <div className="text-muted-foreground text-sm">Loading...</div>
                ) : (
                    <div className="space-y-2 text-sm">
                        <div><b>{BASE_COIN_KEY}:</b> {String(data?.base ?? 0)}</div>
                        <div><b>{QUOTE_COIN_KEY}:</b> {String(data?.quote ?? 0)}</div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
