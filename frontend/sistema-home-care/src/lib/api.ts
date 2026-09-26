const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/api/auth/refresh/`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export interface ApiOptions extends RequestInit {
  /** parsed JSON body will be stringified automatically */
  json?: unknown;
}

export async function api(path: string, options: ApiOptions = {}): Promise<Response> {
  const { json, headers, ...init } = options;
  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : init.body,
    });

  let res = await doFetch();

  // Silent refresh once for expired access cookies (not for auth endpoints).
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    }
  }
  return res;
}

export async function apiJson<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const res = await api(path, options);
  if (!res.ok) {
    const detail = await res
      .json()
      .then((body) => body?.detail ?? JSON.stringify(body))
      .catch(() => res.statusText);
    throw new ApiError(res.status, String(detail));
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
