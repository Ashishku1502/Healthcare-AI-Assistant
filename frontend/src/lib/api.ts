const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : "";
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
  } catch (err: any) {
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      throw new Error(
        "Cannot reach backend server. If using Render free tier, it may take ~45 seconds to wake up from sleep. Please wait a moment and retry."
      );
    }
    throw new Error(err.message || "Network error. Please check your connection.");
  }

  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
    sessionStorage.clear();
    window.location.href = "/login";
  }

  if (res.status === 503) {
    throw new Error("Backend server is warming up on Render (takes ~30s). Please wait a few seconds and try again.");
  }

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const message =
      typeof e.detail === "string"
        ? e.detail
        : Array.isArray(e.detail)
        ? e.detail.map((d: any) => d.msg).join(", ")
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.status === 204 ? (null as T) : res.json();
}

export { BASE };
