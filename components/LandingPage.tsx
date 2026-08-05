import Image from "next/image";
import Link from "next/link";
import EcoMark from "@/components/EcoMark";

function DiagonalArrow() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" viewBox="0 0 16 16" fill="none">
      <path d="M4 12 12 4M6 4h6v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ImpactTag({
  className = "",
  product,
  score,
  verdict,
  detail,
}: {
  className?: string;
  product: string;
  score: number;
  verdict: string;
  detail?: string;
}) {
  return (
    <div className={`absolute hidden border-2 border-[#111714] bg-[#fffdf5] px-3 py-2 text-[#111714] xl:block ${className}`}>
      <p className="font-mono text-[0.68rem] font-semibold leading-none tracking-[-0.04em]">{product}</p>
      <p className="mt-1 flex items-baseline gap-2 font-mono leading-none">
        <span className="text-2xl font-semibold">{score}</span>
        <span className="text-xs font-semibold">/ {verdict}</span>
      </p>
      {detail ? <p className="mt-2 border-t-2 border-[#0d563f] pt-1 font-mono text-[0.58rem] leading-none">{detail}</p> : null}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#dfeef2] font-sans text-[#111714] selection:bg-[#2148d8] selection:text-white">
      <a href="#main-content" className="fixed left-4 top-4 z-50 -translate-y-24 bg-[#0d563f] px-4 py-3 text-sm font-semibold text-white transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-white">
        Skip to content
      </a>

      <header className="absolute inset-x-0 top-0 z-30 p-3 sm:p-4 lg:p-5">
        <nav aria-label="Main navigation" className="mx-auto grid max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center border-2 border-[#111714] bg-white px-4 py-3.5 sm:px-7 sm:py-4">
          <a href="#system" className="hidden w-fit text-sm font-semibold transition-colors hover:text-[#0d563f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111714] sm:block">How it works</a>
          <Link href="/" aria-label="Ecocart home" className="col-start-2 flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[#111714]">
            <EcoMark className="h-7 w-7 text-[#0d563f] sm:h-8 sm:w-8" />
            <span className="text-lg font-semibold tracking-[-0.045em] sm:text-xl">ecocart</span>
          </Link>
          <div className="col-start-3 flex justify-end">
            <Link href="/login" className="text-sm font-semibold transition-colors hover:text-[#0d563f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111714]">Sign in</Link>
          </div>
        </nav>
      </header>

      <main id="main-content">
        <section className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#dfeef2] px-5 pb-12 pt-28 sm:px-8 sm:pb-16 sm:pt-32 lg:px-12">
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 top-24 -z-20 sm:top-28">
            <Image src="/ecocart-illustrated-products-mobile-v3.png" alt="" fill priority sizes="(max-width: 767px) 100vw, 1px" className="object-contain md:hidden" />
            <Image src="/ecocart-illustrated-products-desktop-v3.png" alt="" fill priority sizes="(min-width: 768px) 100vw, 1px" className="hidden object-contain md:block" />
          </div>

          <ImpactTag product="OAT MILK" score={86} verdict="GOOD" detail="climate + packaging" className="left-[17%] top-[39%]" />
          <ImpactTag product="COFFEE" score={61} verdict="REVIEW" detail="climate + packaging" className="left-[45%] top-[14%]" />
          <ImpactTag product="SHAMPOO" score={91} verdict="GOOD" className="right-[14%] top-[38%]" />
          <ImpactTag product="DISH SOAP" score={72} verdict="FAIR" className="bottom-[7%] left-[25%]" />

          <div className="relative z-10 mx-auto mt-[4vh] flex w-full max-w-[760px] flex-col items-center text-center sm:mt-[7vh] lg:mt-[9vh]">
            <h1 className="max-w-[10ch] text-balance text-[clamp(3.7rem,7.2vw,7.6rem)] font-semibold leading-[0.86] tracking-[-0.075em] text-[#080b09]">
              Know what<br className="hidden sm:block" /> you&apos;re buying.
            </h1>

            <p className="mt-7 max-w-[42ch] text-balance text-base font-medium leading-6 text-[#18211d] sm:mt-8 sm:text-lg sm:leading-7">
              Search everyday products, read the evidence, and keep the better option.
            </p>
            <Link href="/signup" className="group mt-6 flex min-h-14 w-full max-w-[290px] items-center justify-between bg-[#0d563f] px-6 py-4 text-base font-semibold text-white outline-none transition-colors hover:bg-[#2148d8] active:bg-[#1439bc] focus-visible:ring-2 focus-visible:ring-[#111714] focus-visible:ring-offset-4 focus-visible:ring-offset-[#dfeef2] sm:mt-7 sm:max-w-[320px] sm:text-lg">
              Start comparing
              <DiagonalArrow />
            </Link>
          </div>
        </section>

        <section id="system" className="bg-[#dfeef2] px-5 pb-24 pt-24 sm:px-8 sm:pb-36 sm:pt-36 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <header className="grid grid-cols-1 gap-8 border-b-2 border-[#111714] pb-10 sm:grid-cols-12 sm:items-end sm:pb-14">
              <p className="font-mono text-xs font-semibold sm:col-span-2 sm:self-start">METHOD / 01-03</p>
              <h2 className="max-w-[11ch] text-[clamp(3.3rem,7vw,7.5rem)] font-semibold leading-[0.86] tracking-[-0.07em] sm:col-span-7">One search.<br />The whole story.</h2>
              <p className="max-w-[30ch] text-lg font-medium leading-7 sm:col-span-3 sm:pb-2">Ecocart turns a product label into a decision you can actually inspect.</p>
            </header>

            <ol className="grid grid-cols-1 border-x-2 border-b-2 border-[#111714] sm:grid-cols-3">
              {[
                ["01", "Find it", "Search by product, brand, or the words already printed on the package."],
                ["02", "Read it", "See ingredients, climate, packaging, and sourcing in plain language."],
                ["03", "Keep it", "Save the better option and carry the reasoning into your next shop."],
              ].map(([number, title, body], index) => (
                <li key={number} className={`relative min-h-72 p-6 sm:min-h-80 sm:p-8 ${index > 0 ? "border-t-2 border-[#111714] sm:border-l-2 sm:border-t-0" : ""}`}>
                  <p className="font-mono text-xs font-semibold">STEP {number}</p>
                  <h3 className="mt-8 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">{title}</h3>
                  <p className="mt-5 max-w-[32ch] text-base leading-7 text-[#35413c]">{body}</p>
                  <span aria-hidden="true" className="absolute bottom-4 right-5 font-mono text-[5rem] font-semibold leading-none text-[#0d563f]/12 sm:text-[7rem]">{number}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-16 overflow-hidden border-y-2 border-[#111714] py-3 sm:mt-24 sm:py-4">
            <p className="sr-only">Ecocart considers ingredients, climate, packaging, sourcing, and better alternatives.</p>
            <div aria-hidden="true" className="ecocart-marquee-track flex w-max items-center whitespace-nowrap font-mono text-sm font-semibold">
              {[0, 1].map((copy) => (
                <span key={copy} className="flex items-center">
                  {['INGREDIENTS', 'CLIMATE', 'PACKAGING', 'SOURCING', 'BETTER ALTERNATIVES'].map((item) => (
                    <span key={`${copy}-${item}`} className="flex items-center"><span className="px-7 sm:px-12">{item}</span><span className="text-[#2148d8]">✳</span></span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#dfeef2] px-5 pb-28 sm:px-8 sm:pb-40 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-12 sm:items-end sm:gap-6">
              <div className="sm:col-span-4 sm:pb-6">
                <p className="font-mono text-xs font-semibold">IMPACT RECEIPT / 04 FACTORS</p>
                <h2 className="mt-6 max-w-[8ch] text-[clamp(3.4rem,6vw,6.5rem)] font-semibold leading-[0.88] tracking-[-0.065em]">Impact, itemized.</h2>
                <p className="mt-7 max-w-[31ch] text-lg leading-7 text-[#35413c]">One score is useful. Seeing what moved it is better.</p>
              </div>
              <figure className="ecocart-scroll-drift relative aspect-[16/9] overflow-hidden border-2 border-[#111714] sm:col-span-8">
                <Image src="/ecocart-impact-receipt.png" alt="A hand-drawn environmental impact receipt with ingredient, climate, packaging, and sourcing rows" fill sizes="(min-width: 640px) 66vw, 100vw" className="object-cover" />
                <figcaption className="absolute bottom-0 left-0 border-r-2 border-t-2 border-[#111714] bg-[#fffdf5] px-4 py-3 font-mono text-[0.68rem] font-semibold">PRODUCT IMPACT / EXPLAINED</figcaption>
              </figure>
            </div>

            <dl className="mt-8 grid grid-cols-1 border-2 border-[#111714] sm:grid-cols-4">
              {[
                ["Ingredients", "82", "What is inside it."],
                ["Climate", "91", "What it costs to make and move."],
                ["Packaging", "76", "What remains after use."],
                ["Sourcing", "88", "How materials are obtained."],
              ].map(([label, score, detail], index) => (
                <div key={label} className={`p-6 sm:min-h-52 sm:p-7 ${index > 0 ? "border-t-2 border-[#111714] sm:border-l-2 sm:border-t-0" : ""}`}>
                  <dt className="font-mono text-xs font-semibold">{label}</dt>
                  <dd className="mt-6 text-6xl font-semibold leading-none tracking-[-0.07em] text-[#2148d8]"><data value={score}>{score}</data></dd>
                  <p className="mt-5 max-w-[20ch] text-sm leading-6 text-[#35413c]">{detail}</p>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="bg-[#dfeef2] px-5 pb-28 sm:px-8 sm:pb-40 lg:px-12">
          <div className="mx-auto max-w-[1400px] border-2 border-[#111714]">
            <div className="grid grid-cols-1 bg-[#0d563f] text-white sm:grid-cols-12">
              <h2 className="max-w-[12ch] p-6 text-[clamp(3.1rem,6vw,6.4rem)] font-semibold leading-[0.88] tracking-[-0.065em] sm:col-span-8 sm:p-10 lg:p-14">Every bar carries evidence.</h2>
              <p className="border-t-2 border-white/70 p-6 text-lg leading-7 sm:col-span-4 sm:border-l-2 sm:border-t-0 sm:p-9 lg:p-12">The overall score is built from the parts. Open any one to see the tradeoff underneath.</p>
            </div>

            <figure className="relative aspect-[16/9] overflow-hidden border-t-2 border-[#111714] bg-[#dfeef2]">
              <Image src="/ecocart-score-barcode.png" alt="A hand-drawn environmental barcode grouped into ingredients, climate, packaging, and sourcing" fill sizes="(min-width: 1400px) 1400px, 100vw" className="object-cover" />
              <span aria-hidden="true" className="ecocart-scan-line absolute inset-y-0 left-0 w-1 bg-[#d59a12] mix-blend-multiply" />
              <figcaption className="absolute bottom-0 right-0 border-l-2 border-t-2 border-[#111714] bg-[#fffdf5] px-4 py-3 font-mono text-[0.68rem] font-semibold">SCORE ANATOMY / LIVE</figcaption>
            </figure>

            <dl className="grid grid-cols-2 border-t-2 border-[#111714] bg-[#fffdf5] sm:grid-cols-4">
              {[["01", "Ingredients"], ["02", "Climate"], ["03", "Packaging"], ["04", "Sourcing"]].map(([number, label], index) => (
                <div key={label} className={`p-5 sm:p-6 ${index % 2 === 1 ? "border-l-2 border-[#111714]" : ""} ${index > 1 ? "border-t-2 border-[#111714] sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-2 sm:border-[#111714]" : ""}`}>
                  <dt className="font-mono text-[0.68rem] font-semibold text-[#0d563f]">{number}</dt>
                  <dd className="mt-3 text-xl font-semibold tracking-[-0.035em] sm:text-2xl">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="bg-[#dfeef2] px-5 pb-28 sm:px-8 sm:pb-40 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <header className="grid grid-cols-1 gap-7 pb-10 sm:grid-cols-12 sm:items-end sm:pb-14">
              <p className="font-mono text-xs font-semibold sm:col-span-3 sm:self-start">BETTER CHOICE / COMPARE</p>
              <h2 className="max-w-[12ch] text-[clamp(3.2rem,6.7vw,7rem)] font-semibold leading-[0.87] tracking-[-0.07em] sm:col-span-7">Keep the better option.</h2>
              <p className="max-w-[28ch] text-lg leading-7 sm:col-span-2 sm:pb-2">No green halo. Just a clearer tradeoff.</p>
            </header>

            <div className="grid grid-cols-1 border-2 border-[#111714] sm:grid-cols-12">
              <figure className="ecocart-scroll-drift relative aspect-[16/10] overflow-hidden sm:col-span-8 sm:aspect-auto sm:min-h-[39rem]">
                <Image src="/ecocart-better-choice.png" alt="Hand-drawn products comparing a current option with a better alternative and a reusable shopping bag" fill sizes="(min-width: 640px) 67vw, 100vw" className="object-cover" />
              </figure>
              <div className="border-t-2 border-[#111714] bg-[#fffdf5] sm:col-span-4 sm:border-l-2 sm:border-t-0">
                <div className="p-6 sm:p-8">
                  <p className="font-mono text-[0.68rem] font-semibold">CURRENT OPTION</p>
                  <p className="mt-5 text-6xl font-semibold tracking-[-0.07em]">64</p>
                  <p className="mt-3 text-sm leading-6 text-[#4c514b]">More packaging. Less sourcing detail.</p>
                </div>
                <div className="border-y-2 border-[#111714] bg-[#2148d8] px-6 py-4 font-mono text-sm font-semibold text-white">SWAP / +22 POINTS</div>
                <div className="p-6 sm:p-8">
                  <p className="font-mono text-[0.68rem] font-semibold">BETTER OPTION</p>
                  <p className="mt-5 text-6xl font-semibold tracking-[-0.07em] text-[#0d563f]">86</p>
                  <p className="mt-3 text-sm leading-6 text-[#4c514b]">Refill format. Clearer materials. Stronger climate score.</p>
                  <Link href="/signup" className="group mt-8 flex min-h-12 w-full items-center justify-between bg-[#0d563f] px-5 py-3 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#2148d8] focus-visible:ring-2 focus-visible:ring-[#111714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf5]">Compare a product <DiagonalArrow /></Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#dfeef2] px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">
          <div className="relative mx-auto max-w-[1400px] overflow-hidden border-2 border-[#111714] bg-[#2148d8] p-6 text-white sm:min-h-[34rem] sm:p-10 lg:p-14">
            <EcoMark className="ecocart-mark-spin absolute -bottom-20 -right-16 h-72 w-72 text-white/12 sm:h-[30rem] sm:w-[30rem]" />
            <div className="relative z-10 flex min-h-[25rem] flex-col justify-between">
              <p className="font-mono text-xs font-semibold">YOUR NEXT SHOP / BETTER INFORMED</p>
              <div>
                <h2 className="max-w-[11ch] text-[clamp(3.5rem,7vw,7.8rem)] font-semibold leading-[0.85] tracking-[-0.075em]">Bring the reasoning to checkout.</h2>
                <Link href="/signup" className="group mt-9 flex min-h-14 w-full max-w-sm items-center justify-between bg-[#fffdf5] px-6 py-4 text-base font-semibold text-[#111714] outline-none transition-colors hover:bg-[#0d563f] hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2148d8]">Create your first list <DiagonalArrow /></Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#dfeef2] px-5 pb-6 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 border-2 border-[#111714] bg-[#fffdf5] sm:grid-cols-12">
          <div className="flex min-h-24 items-center gap-2 p-5 sm:col-span-4 sm:p-7">
            <EcoMark className="h-7 w-7" />
            <span className="font-semibold tracking-[-0.03em]">ecocart</span>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 border-t-2 border-[#111714] text-sm font-semibold sm:col-span-5 sm:grid-cols-3 sm:border-l-2 sm:border-t-0">
            <Link href="#system" className="flex min-h-16 items-center justify-center px-4 transition-colors hover:bg-[#0d563f] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#111714] sm:min-h-24">How it works</Link>
            <Link href="/login" className="flex min-h-16 items-center justify-center border-l-2 border-[#111714] px-4 transition-colors hover:bg-[#0d563f] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#111714] sm:min-h-24">Sign in</Link>
            <Link href="/signup" className="col-span-2 flex min-h-16 items-center justify-center border-t-2 border-[#111714] px-4 transition-colors hover:bg-[#2148d8] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#111714] sm:col-span-1 sm:border-l-2 sm:border-t-0 sm:min-h-24">Create account</Link>
          </nav>
          <div className="flex items-center border-t-2 border-[#111714] bg-[#111714] p-5 font-mono text-[0.68rem] font-semibold text-white sm:col-span-3 sm:border-l-2 sm:border-t-0 sm:p-7">
            © 2026 ECOCART<br />BETTER CONTEXT / LESS NOISE
          </div>
        </div>
      </footer>
    </div>
  );
}
