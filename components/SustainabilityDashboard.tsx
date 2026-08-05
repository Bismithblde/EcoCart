"use client";

import type {
  AssessmentDimension,
  AssessmentEvidenceSummary,
  AssessmentSource,
  AssessmentStatus,
  AssessmentScoreBasis,
  AssessmentScoreMode,
  SustainabilityGrade,
  SustainabilityVerdict,
} from "@/lib/sustainability-types";

interface SustainabilityDashboardProps {
  productName: string;
  ecoScore: number | null;
  grade: SustainabilityGrade;
  scoreMode: AssessmentScoreMode;
  confidencePercent: number;
  scoreExplanation: string;
  scoreBasis?: AssessmentScoreBasis;
  status: AssessmentStatus;
  reasoning?: string;
  verdict?: SustainabilityVerdict;
  tags?: string[];
  confidence?: "low" | "medium" | "high";
  dimensions?: AssessmentDimension[];
  evidence?: AssessmentEvidenceSummary;
  sources?: AssessmentSource[];
  assessedAt?: string;
}

function sourceById(sources: AssessmentSource[]): Map<string, AssessmentSource> {
  return new Map(sources.map((source) => [source.id, source]));
}

function verdictLabel(verdict: SustainabilityVerdict | undefined): string {
  if (verdict === "good") return "Good";
  if (verdict === "moderate") return "Review";
  if (verdict === "poor") return "Poor";
  if (verdict === "insufficient_evidence") return "Not enough evidence";
  return "Scored";
}

function scoreModeLabel(mode: AssessmentScoreMode): string {
  if (mode === "verified") return "Verified";
  if (mode === "blended") return "Blended estimate";
  if (mode === "peer_estimate") return "Peer estimate";
  return "Category estimate";
}

function gradeColor(grade: SustainabilityGrade, scoreAvailable: boolean): string {
  if (!scoreAvailable) return "bg-[#7a5411]";
  if (grade === "A") return "bg-[#0d563f]";
  if (grade === "B") return "bg-[#2148d8]";
  if (grade === "C") return "bg-[#9a6a08]";
  if (grade === "D") return "bg-[#7a5411]";
  return "bg-[#111714]";
}

export default function SustainabilityDashboard({
  productName,
  ecoScore,
  grade,
  scoreMode,
  confidencePercent,
  scoreExplanation,
  scoreBasis,
  status,
  reasoning,
  verdict,
  tags = [],
  confidence,
  dimensions = [],
  evidence,
  sources = [],
  assessedAt,
}: SustainabilityDashboardProps) {
  const sourcesById = sourceById(sources);
  const scoreAvailable = typeof ecoScore === "number";

  return (
    <section className="border-2 border-[#111714] bg-[#fffdf5] text-[#111714]">
      <header className="grid grid-cols-1 border-b-2 border-[#111714] sm:grid-cols-[1fr_auto]">
        <div className="p-5 sm:p-7">
          <p className="font-mono text-[0.68rem] font-semibold text-[#0d563f]">
            IMPACT RECEIPT / {status === "complete" ? "VERIFIED" : status === "estimated" ? "ESTIMATED" : "LIMITED"}
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-none tracking-[-0.05em] sm:text-4xl">
            {productName}
          </h2>
        </div>
        <div
          className={`grid min-w-48 grid-cols-[1fr_auto] items-end gap-4 border-t-2 border-[#111714] p-5 text-white sm:border-l-2 sm:border-t-0 sm:p-7 ${gradeColor(grade, scoreAvailable)}`}
        >
          <div>
            <p className="font-mono text-[0.62rem] font-semibold">OVERALL</p>
            <data
              value={scoreAvailable ? ecoScore : undefined}
              className="mt-2 block text-7xl font-semibold leading-none tracking-[-0.07em]"
            >
              {scoreAvailable ? grade : "N/A"}
            </data>
          </div>
          <span className="text-right font-mono text-[0.62rem] font-semibold leading-5">
            {scoreAvailable ? <>{ecoScore}/100<br />{scoreModeLabel(scoreMode).toUpperCase()}</> : "LIMITED"}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 border-b-2 border-[#111714] sm:grid-cols-[14rem_1fr]">
        <div className="bg-[#2148d8] p-5 text-white sm:border-r-2 sm:border-[#111714]">
          <p className="font-mono text-[0.62rem] font-semibold">VERDICT</p>
          <p className="mt-5 text-xl font-semibold uppercase tracking-[-0.035em]">
            {verdictLabel(verdict)}
          </p>
        </div>
        <div className="grid grid-cols-2 bg-[#dfeef2] sm:grid-cols-4">
          <div className="border-b-2 border-r-2 border-[#111714] p-4 sm:border-b-0">
            <p className="font-mono text-[0.58rem] font-semibold">CONFIDENCE</p>
            <p className="mt-3 text-xl font-semibold">{confidencePercent}%</p>
            <p className="mt-1 text-xs capitalize text-[#4c514b]">{confidence ?? "Low"} confidence</p>
          </div>
          <div className="border-b-2 border-[#111714] p-4 sm:border-b-0 sm:border-r-2">
            <p className="font-mono text-[0.58rem] font-semibold">SOURCES</p>
            <p className="mt-3 font-semibold">{evidence?.source_count ?? sources.length}</p>
          </div>
          <div className="border-r-2 border-[#111714] p-4">
            <p className="font-mono text-[0.58rem] font-semibold">DIRECT</p>
            <p className="mt-3 font-semibold">
              {Math.round((evidence?.coverage ?? 0) * 100)}%
            </p>
          </div>
          <div className="p-4">
            <p className="font-mono text-[0.58rem] font-semibold">RESEARCH</p>
            <p className="mt-3 font-semibold">{evidence?.research_rounds ?? 1} pass{(evidence?.research_rounds ?? 1) === 1 ? "" : "es"}</p>
          </div>
        </div>
      </div>

      <div className="grid border-b-2 border-[#111714] bg-[#fff4de] sm:grid-cols-[1fr_auto]">
        <p className="p-4 text-sm leading-6 sm:px-6">{scoreExplanation}</p>
        {scoreBasis ? (
          <p className="border-t-2 border-[#111714] p-4 font-mono text-[0.6rem] font-semibold sm:border-l-2 sm:border-t-0 sm:px-6">
            {scoreBasis.type === "peer"
              ? `${scoreBasis.peer_count} PEERS / ${scoreBasis.brands_represented} BRANDS`
              : `${scoreBasis.label.toUpperCase()} BASELINE`}
          </p>
        ) : null}
      </div>

      {dimensions.length > 0 ? (
        <div className="grid grid-cols-1 border-b-2 border-[#111714] md:grid-cols-2">
          {dimensions.map((dimension, index) => (
            <article
              key={dimension.id}
              className={`p-5 sm:p-6 ${
                index % 2 === 0 ? "md:border-r-2 md:border-[#111714]" : ""
              } ${index < 2 ? "border-b-2 border-[#111714]" : index === 2 ? "border-b-2 border-[#111714] md:border-b-0" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[0.62rem] font-semibold text-[#0d563f]">
                    {dimension.label.toUpperCase()} / {Math.round(dimension.weight * 100)}%
                  </p>
                  <p className="mt-2 font-mono text-[0.58rem] font-semibold uppercase text-[#4c514b]">
                    {dimension.score_mode === "direct"
                      ? `${dimension.evidence_status} evidence / ${dimension.confidence} confidence`
                      : `${dimension.score_mode.replace(/_/g, " ")} / direct evidence ${dimension.evidence_status}`}
                  </p>
                </div>
                <span className="shrink-0 text-3xl font-semibold tracking-[-0.05em]">
                  {dimension.score_mode === "direct" ? "" : "~"}{dimension.score ?? "N/A"}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#4c514b]">{dimension.summary}</p>
              {dimension.claims.length > 0 ? (
                <ul className="mt-4 space-y-2 text-sm leading-6">
                  {dimension.claims.map((claim, claimIndex) => (
                    <li key={`${dimension.id}-${claimIndex}`}>
                      {claim.claim}{" "}
                      <span className="whitespace-nowrap font-mono text-[0.62rem] font-semibold text-[#0d563f]">
                        {claim.source_ids.map((sourceId) => {
                          const source = sourcesById.get(sourceId);
                          return source ? (
                            <a
                              key={sourceId}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-1 underline decoration-2 underline-offset-2 hover:text-[#2148d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2148d8]"
                              aria-label={`Source: ${source.title}`}
                            >
                              [{sourceId.replace(/[^0-9]/g, "") || "P"}]
                            </a>
                          ) : null;
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div className="flex flex-wrap border-b-2 border-[#111714] bg-[#dfeef2] p-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="border-r-2 border-[#111714] px-3 py-1 font-mono text-[0.62rem] font-semibold uppercase last:border-r-0"
            >
              {tag.replace(/-/g, " ")}
            </span>
          ))}
        </div>
      ) : null}

      {reasoning ? (
        <div className="border-b-2 border-[#111714] p-5 sm:p-7">
          <p className="font-mono text-[0.62rem] font-semibold">ASSESSMENT</p>
          <p className="mt-3 max-w-3xl text-base leading-7">{reasoning}</p>
        </div>
      ) : null}

      {evidence && (evidence.missing.length > 0 || evidence.conflicts.length > 0) ? (
        <div className="grid grid-cols-1 border-b-2 border-[#111714] lg:grid-cols-2">
          <div className="bg-[#fff4de] p-5 sm:p-6 lg:border-r-2 lg:border-[#111714]">
            <p className="font-mono text-[0.62rem] font-semibold">MISSING EVIDENCE</p>
            {evidence.missing.length > 0 ? (
              <ul className="mt-3 list-inside list-square space-y-1 text-sm leading-6">
                {evidence.missing.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : (
              <p className="mt-3 text-sm">No material evidence gaps were reported.</p>
            )}
          </div>
          <div className="border-t-2 border-[#111714] p-5 sm:p-6 lg:border-t-0">
            <p className="font-mono text-[0.62rem] font-semibold">CONFLICTS</p>
            {evidence.conflicts.length > 0 ? (
              <ul className="mt-3 list-inside list-square space-y-1 text-sm leading-6">
                {evidence.conflicts.map((conflict) => (
                  <li key={`${conflict.summary}-${conflict.source_ids.join("-")}`}>
                    {conflict.summary}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm">No conflicting evidence was found.</p>
            )}
          </div>
        </div>
      ) : null}

      <details className="group border-b-2 border-[#111714]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold transition-colors hover:bg-[#dfeef2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2148d8] sm:px-7">
          <span>Sources ({sources.length})</span>
          <span className="font-mono text-[0.62rem] font-semibold group-open:hidden">OPEN</span>
          <span className="hidden font-mono text-[0.62rem] font-semibold group-open:inline">CLOSE</span>
        </summary>
        {sources.length > 0 ? (
          <ol className="divide-y-2 divide-[#111714] border-t-2 border-[#111714]">
            {sources.map((source, index) => (
              <li key={source.id} className="grid grid-cols-[2rem_1fr] gap-3 p-5 sm:p-6">
                <span className="font-mono text-xs font-semibold text-[#0d563f]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline decoration-2 underline-offset-4 transition-colors hover:text-[#2148d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2148d8]"
                  >
                    {source.title}
                  </a>
                  <p className="mt-1 font-mono text-[0.58rem] font-semibold text-[#4c514b]">
                    {source.domain || source.kind}
                    {typeof source.position === "number" ? ` / RESULT ${source.position}` : ""}
                  </p>
                  {source.snippet ? (
                    <p className="mt-2 text-sm leading-6 text-[#4c514b]">{source.snippet}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="border-t-2 border-[#111714] p-5 text-sm sm:px-7">
            No reliable sources were available for this assessment.
          </p>
        )}
      </details>

      {assessedAt ? (
        <p className="px-5 py-3 font-mono text-[0.58rem] font-semibold text-[#4c514b] sm:px-7">
          ASSESSED {new Date(assessedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).toUpperCase()}
        </p>
      ) : null}
      <div
        className="h-3 border-t-2 border-[#111714] bg-[repeating-linear-gradient(90deg,#111714_0,#111714_3px,transparent_3px,transparent_7px)]"
        aria-hidden="true"
      />
    </section>
  );
}
