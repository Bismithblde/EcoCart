'use client';

interface Metrics {
  carbonFootprint: string;
  waterUsage: string;
  packaging: string;
}

interface SustainabilityDashboardProps {
  productName: string;
  ecoScore: number;
  metrics: Metrics;
  reasoning?: string;
  verdict?: 'good' | 'moderate' | 'poor';
  tags?: string[];
  confidence?: 'low' | 'medium' | 'high';
  sources?: Array<{
    id: string;
    title: string;
    url: string;
    snippet?: string;
    kind: 'product' | 'web';
  }>;
  assessedAt?: string;
}

export default function SustainabilityDashboard({ productName, ecoScore, metrics, reasoning, verdict, tags = [], confidence, sources = [], assessedAt }: SustainabilityDashboardProps) {
  const verdictLabel = verdict === 'good' ? 'Good' : verdict === 'moderate' ? 'Review' : verdict === 'poor' ? 'Poor' : 'Scored';

  return (
    <section className="border-2 border-[#111714] bg-[#fffdf5] text-[#111714]">
      <header className="grid grid-cols-1 border-b-2 border-[#111714] sm:grid-cols-[1fr_auto]">
        <div className="p-5 sm:p-7">
          <p className="font-mono text-[0.68rem] font-semibold text-[#0d563f]">IMPACT RECEIPT / COMPLETE</p>
          <h2 className="mt-3 text-3xl font-semibold leading-none tracking-[-0.05em] sm:text-4xl">{productName}</h2>
        </div>
        <div className="flex min-w-44 items-end justify-between border-t-2 border-[#111714] bg-[#0d563f] p-5 text-white sm:border-l-2 sm:border-t-0 sm:p-7">
          <div><p className="font-mono text-[0.62rem] font-semibold">OVERALL</p><data value={ecoScore} className="mt-2 block text-6xl font-semibold leading-none tracking-[-0.07em]">{ecoScore}</data></div>
          <span className="font-mono text-xs font-semibold">/100</span>
        </div>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-4">
        <div className="border-b-2 border-[#111714] bg-[#2148d8] p-5 text-white sm:border-b-0 sm:border-r-2">
          <p className="font-mono text-[0.62rem] font-semibold">VERDICT</p>
          <p className="mt-6 text-2xl font-semibold uppercase tracking-[-0.04em]">{verdictLabel}</p>
        </div>
        {[
          ['CARBON', metrics.carbonFootprint],
          ['WATER', metrics.waterUsage],
          ['PACKAGING', metrics.packaging],
        ].map(([label, value], index) => (
          <div key={label} className={`p-5 sm:p-6 ${index > 0 ? 'border-t-2 border-[#111714] sm:border-l-2 sm:border-t-0' : ''}`}>
            <p className="font-mono text-[0.62rem] font-semibold text-[#0d563f]">{label}</p>
            <p className="mt-6 text-lg font-semibold leading-tight">{value}</p>
          </div>
        ))}
      </div>
      {tags.length > 0 ? <div className="flex flex-wrap border-t-2 border-[#111714] bg-[#dfeef2] p-3">{tags.map((tag) => <span key={tag} className="border-r-2 border-[#111714] px-3 py-1 font-mono text-[0.62rem] font-semibold uppercase last:border-r-0">{tag.replace(/-/g, ' ')}</span>)}</div> : null}
      {reasoning ? <div className="border-t-2 border-[#111714] p-5 sm:p-7"><p className="font-mono text-[0.62rem] font-semibold">WHY THIS SCORE</p><p className="mt-3 max-w-3xl text-base leading-7">{reasoning}</p></div> : null}
      {(confidence || sources.length > 0) ? (
        <div className="grid grid-cols-1 border-t-2 border-[#111714] lg:grid-cols-[14rem_1fr]">
          <div className="bg-[#dfeef2] p-5 lg:border-r-2 lg:border-[#111714] sm:p-7">
            <p className="font-mono text-[0.62rem] font-semibold">EVIDENCE CHECK</p>
            {confidence ? <p className="mt-4 text-xl font-semibold capitalize">{confidence} confidence</p> : null}
            {assessedAt ? (
              <p className="mt-2 text-sm leading-5 text-[#4c514b]">
                Assessed {new Date(assessedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            ) : null}
          </div>
          <ol className="divide-y-2 divide-[#111714]">
            {sources.map((source, index) => (
              <li key={source.id} className="grid grid-cols-[2rem_1fr] gap-3 p-5 sm:p-6">
                <span className="font-mono text-xs font-semibold text-[#0d563f]">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold underline decoration-2 underline-offset-4 transition-colors hover:text-[#2148d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2148d8]">
                    {source.title}
                  </a>
                  {source.snippet ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#4c514b]">{source.snippet}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <div className="h-3 border-t-2 border-[#111714] bg-[repeating-linear-gradient(90deg,#111714_0,#111714_3px,transparent_3px,transparent_7px)]" aria-hidden="true" />
    </section>
  );
}
