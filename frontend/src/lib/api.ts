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
      const e = await res.json().catch(() => ({}));
      const message =
        typeof e.detail === "string"
          ? e.detail
          : Array.isArray(e.detail)
          ? e.detail.map((d: any) => d.msg).join(", ")
          : "Request failed";
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
        `Backend unreachable at ${base}. To connect your Render backend, set your API endpoint below or pass ?api=https://your-backend.onrender.com in the URL.`
      );
    }
    throw err;
  }
}
export { getApiBase as BASE };
