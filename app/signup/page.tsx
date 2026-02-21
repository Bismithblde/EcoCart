"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);

  function validEmail(v: string) {
    return /\S+@\S+\.\S+/.test(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!validEmail(email)) return setError("Enter a valid email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Signup failed");
      if (data.error?.includes("rate limit")) {
        setCooldown(60);
        const timer = setInterval(() => setCooldown(prev => prev > 0 ? prev - 1 : 0), 1000);
        setTimeout(() => clearInterval(timer), 60000);
      }
      return;
    }

    if (data.access_token) {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      router.push("/");
      return;
    }

    setInfo(data.message || "Account created. Check your email to confirm.");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 font-sans">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center h-16">
          <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            EcoCart
          </Link>
        </nav>
      </header>

      <div className="flex flex-col items-center justify-center flex-1 px-4 py-12">
      <main className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create your account
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Join EcoCart and start making sustainable choices
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900/50 outline-none transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900/50 outline-none transition"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900/50 outline-none transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-300 font-semibold text-sm">{error}</p>
              </div>
            )}

            {info && (
              <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-700 dark:text-green-300 font-semibold text-sm">{info}</p>
              </div>
            )}

            {cooldown > 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-yellow-700 dark:text-yellow-300 font-semibold text-sm">
                  Too many attempts. Try again in {cooldown}s
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 transition-colors duration-200 flex items-center justify-center gap-2"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {loading ? "Creating…" : cooldown > 0 ? `Wait ${cooldown}s` : "Sign up"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}