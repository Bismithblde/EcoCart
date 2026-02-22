"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const REFRESH_BUFFER_MS = 60 * 1000; // refresh when within 60s of expiry

export interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  setSession: (
    access_token: string,
    refresh_token: string,
    expires_in: number,
    user: AuthUser
  ) => void;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodePayload(accessToken: string): Record<string, unknown> | null {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    return JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getExpiresAt(accessToken: string): number | null {
  const decoded = decodePayload(accessToken);
  if (!decoded || typeof decoded.exp !== "number") return null;
  return decoded.exp * 1000;
}

function getUserFromToken(accessToken: string): AuthUser | null {
  const decoded = decodePayload(accessToken);
  if (!decoded || typeof decoded.sub !== "string") return null;
  return {
    id: decoded.sub,
    email: typeof decoded.email === "string" ? decoded.email : null,
  };
}

function persistSession(
  access_token: string,
  refresh_token: string,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
}

function clearPersistedSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const setSession = useCallback(
    (
      newAccessToken: string,
      newRefreshToken: string,
      expires_in: number,
      newUser: AuthUser
    ) => {
      const at = Date.now() + expires_in * 1000;
      persistSession(newAccessToken, newRefreshToken);
      setAccessToken(newAccessToken);
      setExpiresAt(at);
      setUser(newUser);
    },
    []
  );

  const logout = useCallback(() => {
    clearPersistedSession();
    setAccessToken(null);
    setExpiresAt(null);
    setUser(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    const refresh_token =
      typeof window !== "undefined"
        ? localStorage.getItem(REFRESH_TOKEN_KEY)
        : null;
    if (!refresh_token) {
      logout();
      return null;
    }
    const promise = (async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token }),
        });
        const data = await res.json();
        if (!res.ok) {
          logout();
          return null;
        }
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email ?? null,
        };
        setSession(
          data.access_token,
          data.refresh_token,
          data.expires_in ?? 3600,
          authUser
        );
        return data.access_token;
      } catch {
        logout();
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();
    refreshPromiseRef.current = promise;
    return promise;
  }, [logout, setSession]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
    const now = Date.now();
    const expires = expiresAt ?? (stored ? getExpiresAt(stored) : null);
    const needsRefresh = !stored || (expires != null && now >= expires - REFRESH_BUFFER_MS);
    if (needsRefresh) {
      return refreshSession();
    }
    return stored;
  }, [expiresAt, refreshSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const at = localStorage.getItem(ACCESS_TOKEN_KEY);
    const rt = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!at || !rt) {
      setUser(null);
      setAccessToken(null);
      setExpiresAt(null);
      setIsLoading(false);
      return;
    }
    const exp = getExpiresAt(at);
    const now = Date.now();
    if (exp != null && now >= exp - REFRESH_BUFFER_MS) {
      refreshSession().then((token) => {
        if (token) {
          const expNew = getExpiresAt(token);
          setExpiresAt(expNew);
          setAccessToken(token);
          setUser((prev) => prev ?? { id: "", email: null });
        } else {
          setUser(null);
          setAccessToken(null);
          setExpiresAt(null);
        }
        setIsLoading(false);
      });
      return;
    }
    setAccessToken(at);
    setExpiresAt(exp);
    setUser(getUserFromToken(at));
    setIsLoading(false);
  }, [refreshSession]);

  const value: AuthContextValue = {
    user,
    accessToken,
    isLoading,
    setSession,
    logout,
    getAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx == null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
