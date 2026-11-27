export const PRODUCTION_API_URL = "https://parchi-api.vercel.app";

export function getApiBase(): string {
  const envUrl = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.VITE_API_URL ||
    ""
  ).trim().replace(/\/+$/, "");

  // In browser context:
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.168.") ||
      host.endsWith(".local");

    // When accessed on any public URL (e.g. *.vercel.app), NEVER use localhost!
    if (!isLocal) {
      if (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1") || envUrl.startsWith("http://")) {
        return PRODUCTION_API_URL;
      }
      return envUrl;
    }

    // On local machine, use env if specified, otherwise local dev backend
    return envUrl || "http://localhost:8000";
  }

  // Server-side / static build context
  if (envUrl && !envUrl.includes("localhost")) {
    return envUrl;
  }
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return PRODUCTION_API_URL;
  }
  return envUrl || "http://localhost:8000";
}

export type BackendHealthStatus = "waking" | "ready" | "offline";

const HEALTH_TIMEOUT_MS = 15_000;
const HEALTH_MAX_RETRIES = 2;

async function checkUrlHealth(targetUrl: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${targetUrl}/health`, {
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

async function fetchHealthOnce(base: string, timeoutMs: number): Promise<boolean> {
  // First attempt current base
  const ok = await checkUrlHealth(base, timeoutMs);
  if (ok) return true;

  // Fallback to production if current base was unreachable
  if (base !== PRODUCTION_API_URL) {
    const fallbackOk = await checkUrlHealth(PRODUCTION_API_URL, 8_000);
    if (fallbackOk) return true;
  }

  return false;
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
  let base = getApiBase();
  let url = `${base}${cleanPath}`;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };

  let res: Response;
  try {
    res = await fetch(url, { ...opts, headers });
  } catch (err: any) {
    // If request failed with network error and we weren't already using production URL,
    // automatically try against the production URL as transparent fallback
    if (base !== PRODUCTION_API_URL) {
      try {
        base = PRODUCTION_API_URL;
        url = `${base}${cleanPath}`;
        res = await fetch(url, { ...opts, headers });
      } catch {
        throw new Error("Server is waking up or unreachable. Please try again in a moment.");
      }
    } else {
      throw new Error("Server is waking up or unreachable. Please try again in a moment.");
    }
  }

  if (
    res.status === 401 &&
    typeof window !== "undefined" &&
    cleanPath !== "/auth/login" &&
    cleanPath !== "/auth/signup" &&
    cleanPath !== "/auth/register"
  ) {
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
}

export { getApiBase as BASE };
