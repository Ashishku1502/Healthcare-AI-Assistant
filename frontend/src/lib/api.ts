const rawBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BASE = rawBase.replace(/\/+$/, "");

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE}${cleanPath}`;

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
}
export { BASE };
