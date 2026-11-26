export function getApiBase(): string {
  const raw = (process.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
  return raw || "http://localhost:8000";
}

export type BackendHealthStatus = "waking" | "ready" | "offline";

const HEALTH_TIMEOUT_MS = 60_000;
const HEALTH_MAX_RETRIES = 3;

async function fetchHealthOnce(base: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data && data.status === "ok");
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function pollBackendHealth(
  onStatus?: (status: BackendHealthStatus) => void,
  signal?: AbortSignal
): Promise<boolean> {
  const base = getApiBase();
  onStatus?.("waking");

  for (let attempt = 0; attempt <= HEALTH_MAX_RETRIES; attempt++) {
    if (signal?.aborted) return false;
    const ok = await fetchHealthOnce(base, HEALTH_TIMEOUT_MS);
    if (ok) {
      if (!signal?.aborted) onStatus?.("ready");
      return true;
    }
    if (attempt < HEALTH_MAX_RETRIES && !signal?.aborted) {
      onStatus?.("waking");
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  if (!signal?.aborted) onStatus?.("offline");
  return false;
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBase();
  const url = `${base}${cleanPath}`;

  try {
    const res = await fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
    if (res.status === 401 && typeof window !== "undefined" && !cleanPath.startsWith("/auth/")) {
      sessionStorage.clear();
      window.location.href = "/login";
    }
    if (!res.ok) {
      const rawText = await res.text().catch(() => "");
      let e: any = {};
      try {
        e = rawText ? JSON.parse(rawText) : {};
      } catch {
        e = {};
      }
      const message =
        typeof e.detail === "string"
          ? e.detail
          : Array.isArray(e.detail)
            ? e.detail
              .map((d: any) => (d.loc ? `${d.loc[d.loc.length - 1]}: ${d.msg}` : d.msg))
              .join(", ")
          : `Request failed (HTTP ${res.status}).`;
      throw new Error(message);
    }
    return res.status === 204 ? (null as T) : res.json();
  } catch (err: any) {
    if (err instanceof TypeError) {
      throw new Error("Server is waking up or unreachable. Please try again in a moment.");
    }
    throw err;
  }
}

export { getApiBase as BASE };
