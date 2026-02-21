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

    // If a session is returned, you can store tokens (not recommended for production)
    if (data.access_token) {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      router.push("/");
      return;
    }

    // Otherwise show message (e.g. check email to confirm)
    setInfo(data.message || "Account created. Check your email to confirm.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Create account</h1>

        <div>
          <label className="block text-sm">Email</label>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="mt-1 w-full rounded border px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm">Password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required className="mt-1 w-full rounded border px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm">Confirm password</label>
          <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required className="mt-1 w-full rounded border px-3 py-2" />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {info && <div className="text-sm text-green-600">{info}</div>}
        {cooldown > 0 && <div className="text-sm text-yellow-600">Too many attempts. Try again in {cooldown}s</div>}

        <button type="submit" disabled={loading || cooldown > 0} className="w-full rounded bg-black text-white py-2 disabled:opacity-60">
          {loading ? "Creating…" : cooldown > 0 ? `Wait ${cooldown}s` : "Sign up"}
        </button>

        <p className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
