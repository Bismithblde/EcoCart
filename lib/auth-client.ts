/**
 * Client-side auth: read access_token from localStorage (set by login/signup).
 * Use authFetch for API calls that require Authorization: Bearer <token>.
 */

const ACCESS_TOKEN_KEY = "access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Fetch with Authorization: Bearer <access_token>.
 * Returns null if no token (caller should redirect to login or show sign-in CTA).
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  return fetch(url, { ...options, headers });
}
