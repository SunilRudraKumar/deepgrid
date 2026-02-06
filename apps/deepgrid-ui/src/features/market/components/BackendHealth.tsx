import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";

export function BackendHealth() {
    const { data, isPending, error } = useQuery({
        queryKey: ["apiHealth"],
        queryFn: () => apiGet<{ up: true }>("/v1/health"),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Backend</CardTitle>
                <CardDescription>Fastify API connectivity</CardDescription>
            </CardHeader>
            <CardContent>
                {error ? (
                    <div className="text-destructive-foreground">
                        {(error as Error).message}
                    </div>
                ) : isPending ? (
                    <div className="text-muted-foreground">Checking...</div>
                ) : (
                    <div className="text-green-600">Up: {String(data?.up)}</div>
                )}
            </CardContent>
        </Card>
    );
}
