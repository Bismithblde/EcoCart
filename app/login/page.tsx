"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/\S+@\S+\.\S+/.test(email)) return setError("Invalid email");
    if (password.length < 6) return setError("Password too short");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login failed");
      if (data.error?.includes("rate limit")) {
        setCooldown(60);
        const timer = setInterval(() => setCooldown((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
        setTimeout(() => clearInterval(timer), 60000);
      }
      return;
    }

    if (data.access_token) {
      setSession(
        data.access_token,
        data.refresh_token,
        data.expires_in ?? 3600,
        { id: data.user.id, email: data.user.email ?? null }
      );
      router.push("/");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950 font-sans">
      <header className="bg-white dark:bg-gray-950">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center h-14">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>
        </nav>
      </header>

      <div className="flex flex-col items-center justify-center flex-1 px-4 py-12">
        <main className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Sign in to your account
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Welcome back to ECOCART
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                  <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
                </div>
              )}

              {cooldown > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">
                    Too many attempts. Try again in {cooldown}s
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="w-full rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium py-3 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
              >
                {loading && (
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {loading ? "Signing in…" : cooldown > 0 ? `Wait ${cooldown}s` : "Sign in"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-gray-900 dark:text-white hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
