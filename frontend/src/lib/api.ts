export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const queryApi = params.get("api");
    if (queryApi) {
      const clean = queryApi.trim().replace(/\/+$/, "");
      sessionStorage.setItem("custom_api_url", clean);
      return clean;
    }
    const custom = sessionStorage.getItem("custom_api_url");
    if (custom) return custom.trim().replace(/\/+$/, "");
  }
  const rawBase = (process.env.NEXT_PUBLIC_API_URL || "").trim();
  if (rawBase) return rawBase.replace(/\/+$/, "");
  return "http://localhost:8000";
}

export function setApiBase(url: string) {
  if (typeof window !== "undefined") {
    if (url) {
      sessionStorage.setItem("custom_api_url", url.trim().replace(/\/+$/, ""));
    } else {
      sessionStorage.removeItem("custom_api_url");
    }
  }
}

export async function checkBackendHealth(baseUrl?: string): Promise<boolean> {
  const base = (baseUrl || getApiBase()).trim().replace(/\/+$/, "");
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${base}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data && data.status === "ok");
  } catch {
    return false;
  }
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
          : `Backend at ${base} returned HTTP ${res.status}. Verify the FastAPI backend URL via "Connect Cloud Backend".`;
      throw new Error(message);
    }
    return res.status === 204 ? (null as T) : res.json();
  } catch (err: any) {
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      base.startsWith("http://localhost")
    ) {
      throw new Error(
        `Backend unreachable at ${base}. Click "Connect Cloud Backend" or pass ?api=https://your-backend.onrender.com in the URL.`
      );
    }
    if (err instanceof TypeError) {
      throw new Error(
        `Cannot reach Parchi backend at ${base}. Ensure the FastAPI server is running or update the API URL via "Connect Cloud Backend".`
      );
    }
    throw err;
  }
}
export { getApiBase as BASE };
