export function bmStorageKey(network: string, address: string) {
    return `deepgrid:bm:${network}:${address}`;
}

export function getStoredManagerId(network: string, address: string) {
    return localStorage.getItem(bmStorageKey(network, address));
}

export function setStoredManagerId(network: string, address: string, managerId: string) {
    localStorage.setItem(bmStorageKey(network, address), managerId);
}
