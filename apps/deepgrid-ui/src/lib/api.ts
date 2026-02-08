export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string } };
export type ApiResp<T> = ApiOk<T> | ApiErr;

export const API_URL =
    (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8787";

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
    const url = new URL(path, API_URL);
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            if (v === undefined) continue;
            url.searchParams.set(k, String(v));
        }
    }
    return url.toString();
}

export async function apiGet<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
    const res = await fetch(buildUrl(path, params), {
        method: "GET",
        headers: { Accept: "application/json" },
    });

    const json = (await res.json()) as ApiResp<T>;

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    if (!json.ok) {
        throw new Error(`${json.error.code}: ${json.error.message}`);
    }
    return json.data;
}
