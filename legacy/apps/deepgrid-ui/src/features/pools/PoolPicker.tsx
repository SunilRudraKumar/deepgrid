import { POOLS } from "./pools";

export function PoolPicker({
    value,
    onChange,
}: {
    value: string;
    onChange: (next: string) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">Pool</div>
            <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {POOLS.map((p) => (
                    <option key={p.key} value={p.key}>
                        {p.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
