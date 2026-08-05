"use client";

import Link from "next/link";
import EcoMark from "@/components/EcoMark";

export default function AppHeader({
  active,
  email,
  onSignOut,
}: {
  active?: "dashboard" | "lists";
  email?: string | null;
  onSignOut?: () => void;
}) {
  const navClass = (selected: boolean) =>
    `flex min-h-12 items-center border-l-2 border-[#111714] px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#111714] sm:min-h-14 sm:px-5 ${
      selected ? "bg-[#0d563f] text-white" : "bg-[#fffdf5] hover:bg-[#2148d8] hover:text-white"
    }`;

  return (
    <header className="bg-[#dfeef2] px-3 pt-3 sm:px-5 sm:pt-5">
      <nav aria-label="App navigation" className="mx-auto flex max-w-[1400px] items-stretch border-2 border-[#111714] bg-[#fffdf5] text-[#111714]">
        <Link href="/" aria-label="Ecocart dashboard" className="flex min-w-0 flex-1 items-center gap-2 px-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#111714] sm:px-6">
          <EcoMark className="h-7 w-7 shrink-0 text-[#0d563f]" />
          <span className="font-semibold tracking-[-0.025em]">ECOCART</span>
        </Link>
        {email ? <span className="hidden max-w-48 items-center truncate border-l-2 border-[#111714] px-5 font-mono text-[0.65rem] font-semibold lg:flex" title={email}>{email}</span> : null}
        <Link href="/" aria-current={active === "dashboard" ? "page" : undefined} className={navClass(active === "dashboard")}>Analyze</Link>
        <Link href="/shopping-lists" aria-current={active === "lists" ? "page" : undefined} className={navClass(active === "lists")}>Lists</Link>
        {onSignOut ? <button type="button" onClick={onSignOut} className="hidden min-h-14 border-l-2 border-[#111714] bg-[#111714] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#2148d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white sm:block">Sign out</button> : null}
      </nav>
    </header>
  );
}
