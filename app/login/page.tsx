"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import AuthPageShell from "@/components/AuthPageShell";

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
    <AuthPageShell eyebrow="ACCOUNT / RETURNING" title="Pick up where you left off." description="Your saved lists and product evidence stay together, ready for the next shop.">
      <div className="mb-8 border-b-2 border-[#111714] pb-6">
        <p className="font-mono text-[0.68rem] font-semibold text-[#0d563f]">ACCESS RECEIPT / 01</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Sign in.</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block font-mono text-[0.68rem] font-semibold">EMAIL ADDRESS</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="min-h-13 w-full border-2 border-[#111714] bg-white px-4 py-3 text-base outline-none transition-colors placeholder:text-[#727873] focus:bg-[#dfeef2] focus:ring-2 focus:ring-[#2148d8] focus:ring-offset-2" placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block font-mono text-[0.68rem] font-semibold">PASSWORD</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="min-h-13 w-full border-2 border-[#111714] bg-white px-4 py-3 text-base outline-none transition-colors placeholder:text-[#727873] focus:bg-[#dfeef2] focus:ring-2 focus:ring-[#2148d8] focus:ring-offset-2" placeholder="••••••••" />
        </div>
        {error ? <div role="alert" className="border-2 border-[#111714] bg-[#fff4de] p-4 text-sm font-semibold"><span className="font-mono text-[0.68rem]">CHECK / </span>{error}</div> : null}
        {cooldown > 0 ? <div className="border-2 border-[#111714] bg-[#d59a12] p-4 text-sm font-semibold">Too many attempts. Try again in {cooldown}s</div> : null}
        <button type="submit" disabled={loading || cooldown > 0} className="flex min-h-14 w-full items-center justify-between bg-[#0d563f] px-5 py-4 font-semibold text-white transition-colors hover:bg-[#2148d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111714] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          <span>{loading ? "Signing in..." : cooldown > 0 ? `Wait ${cooldown}s` : "Sign in"}</span><span aria-hidden="true">↗</span>
        </button>
      </form>
      <p className="mt-7 border-t-2 border-[#111714] pt-5 text-sm">New here? <Link href="/signup" className="font-semibold underline decoration-2 underline-offset-4 hover:text-[#0d563f]">Create an account</Link></p>
    </AuthPageShell>
  );
}
