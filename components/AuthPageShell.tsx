import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import EcoMark from "@/components/EcoMark";

export default function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#dfeef2] font-sans text-[#111714] selection:bg-[#2148d8] selection:text-white">
      <header className="p-3 sm:p-5">
        <nav className="mx-auto grid max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center border-2 border-[#111714] bg-[#fffdf5] px-4 py-3 sm:px-6">
          <Link href="/" className="w-fit font-mono text-[0.68rem] font-semibold hover:text-[#0d563f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111714]">BACK / HOME</Link>
          <Link href="/" aria-label="Ecocart home" className="col-start-2 flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[#111714]">
            <EcoMark className="h-7 w-7 text-[#0d563f]" />
            <span className="font-semibold tracking-[-0.04em]">ecocart</span>
          </Link>
        </nav>
      </header>

      <main className="mx-auto grid min-h-[calc(100svh-6rem)] max-w-[1400px] grid-cols-1 px-3 pb-3 sm:px-5 sm:pb-5 lg:grid-cols-12">
        <section className="relative flex min-h-[23rem] flex-col justify-between overflow-hidden border-2 border-b-0 border-[#111714] bg-[#dfeef2] p-5 sm:p-8 lg:col-span-7 lg:min-h-0 lg:border-b-2 lg:border-r-0 lg:p-10">
          <div className="relative z-10">
            <p className="font-mono text-[0.68rem] font-semibold">{eyebrow}</p>
            <h1 className="mt-5 max-w-[9ch] text-[clamp(3.2rem,7vw,7.4rem)] font-semibold leading-[0.86] tracking-[-0.07em]">{title}</h1>
          </div>
          <Image src="/ecocart-better-choice.png" alt="Hand-drawn household products with an arrow pointing toward a better choice" fill priority sizes="(min-width: 1024px) 58vw, 100vw" className="object-contain object-bottom opacity-90" />
          <p className="relative z-10 max-w-sm border-2 border-[#111714] bg-[#fffdf5] p-4 text-sm leading-6 sm:p-5">{description}</p>
        </section>
        <section className="flex items-center border-2 border-[#111714] bg-[#fffdf5] p-5 sm:p-9 lg:col-span-5 lg:p-12">
          <div className="w-full">{children}</div>
        </section>
      </main>
    </div>
  );
}
