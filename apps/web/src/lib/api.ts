const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "/api" : "http://localhost:4000/api");

interface ApiOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

function setTokens(accessToken: string, refreshToken?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", accessToken);
  if (refreshToken) {
    localStorage.setItem("refresh_token", refreshToken);
  }
}

function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void): void {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const userId = userStr ? JSON.parse(userStr)?.id : null;
  if (!userId) {
    clearTokens();
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = await response.json();
    const newAccessToken = data.accessToken || data.access_token;
    const newRefreshToken = data.refreshToken || data.refresh_token;
    setTokens(newAccessToken, newRefreshToken);
    return newAccessToken;
  } catch {
    clearTokens();
    return null;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: ApiOptions
): Promise<ApiResponse<T>> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal: options?.signal,
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  let response = await fetch(url, fetchOptions);

  // Token expired - attempt refresh
  if (response.status === 401 && token) {
    if (isRefreshing) {
      const newToken = await new Promise<string>((resolve) => {
        subscribeTokenRefresh(resolve);
      });
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, { ...fetchOptions, headers });
    } else {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        onRefreshed(newToken);
        headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(url, { ...fetchOptions, headers });
      } else {
        // Could not refresh - redirect to login
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new ApiError("Session expired", 401, null);
      }
    }
  }

  let responseBody: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    responseBody = await response.json();
  } else if (response.status !== 204) {
    responseBody = await response.text();
  }

  if (!response.ok) {
    const message =
      (responseBody as Record<string, string>)?.message ||
      `HTTP ${response.status}`;
    throw new ApiError(message, response.status, responseBody);
  }

  return {
    data: responseBody as T,
    status: response.status,
    ok: response.ok,
  };
}

export const api = {
  get<T>(path: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return request<T>("GET", path, undefined, options);
  },

  post<T>(
    path: string,
    body?: unknown,
    options?: ApiOptions
  ): Promise<ApiResponse<T>> {
    return request<T>("POST", path, body, options);
  },

  patch<T>(
    path: string,
    body?: unknown,
    options?: ApiOptions
  ): Promise<ApiResponse<T>> {
    return request<T>("PATCH", path, body, options);
  },

  put<T>(
    path: string,
    body?: unknown,
    options?: ApiOptions
  ): Promise<ApiResponse<T>> {
    return request<T>("PUT", path, body, options);
  },

  delete<T>(path: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return request<T>("DELETE", path, undefined, options);
  },
};

export { ApiError, setTokens, clearTokens, getAccessToken };
