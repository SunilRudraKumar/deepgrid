import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function GridBotPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Grid Bot</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
                Grid bot UI goes here (separate module).
            </CardContent>
        </Card>
    );
}
