function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  // If an external backend is specified and valid, use it
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/+$/, "");
  }
  // When running locally in development, use local backend on port 8000
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return envUrl || "http://localhost:8000";
    }
    // On Vercel (or any cloud domain), use internal "/api" routes directly:
    // This makes Vercel 100% self-hosted with zero external dependencies and zero 503 errors!
    return "/api";
  }
  return envUrl || "/api";
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const base = getBaseUrl();
  const targetUrl = base === "/api" ? `/api${path}` : `${base}${path}`;
  const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : "";

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
  } catch (err: any) {
    throw new Error(err.message || "Network request failed. Please check your connection.");
  }

  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
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
          : e.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.status === 204 ? (null as T) : res.json();
}

export { getBaseUrl };
