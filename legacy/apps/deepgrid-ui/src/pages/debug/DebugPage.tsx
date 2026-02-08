import { WalletStatus } from "../../WalletStatus";
import { OwnedObjects } from "../../OwnedObjects";

export function DebugPage() {
    return (
        <div className="space-y-4">
            <WalletStatus />
            <OwnedObjects />
        </div>
    );
}
