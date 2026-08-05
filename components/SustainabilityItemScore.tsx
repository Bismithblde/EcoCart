"use client";

import { useState, useEffect } from "react";
import type { ShoppingListSustainability } from "@/lib/shopping-list";
import { AssessmentProgress } from "@/components/AssessmentProgress";
import { ASSESSMENT_PROGRESS_STEPS } from "@/hooks/useAnalyzeSustainability";

interface SustainabilityItemScoreProps {
  sustainability: ShoppingListSustainability | null;
  loading?: boolean;
  error?: string | null;
}

function scoreColor(score: number): string {
  if (score >= 80) return "bg-[#0d563f] text-white";
  if (score >= 60) return "bg-[#d59a12] text-[#111714]";
  if (score >= 40) return "bg-[#fff4de] text-[#111714]";
  return "bg-[#111714] text-white";
}

export function SustainabilityItemScore({
  sustainability,
  loading = false,
  error = null,
}: SustainabilityItemScoreProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[#111714]">
      {loading && (
        <LoadingAssessment />
      )}
      {error && !loading && (
        <span className="border-b-2 border-[#111714] font-mono text-[0.62rem] font-semibold" title={error}>
          Score unavailable
          {error.trim() && (() => {
            const firstLine = error.split(/\r?\n/)[0].trim();
            const excerpt = firstLine.slice(0, 60);
            return (
              <span className="ml-1 opacity-90">
                ({excerpt}
                {firstLine.length > 60 ? "..." : ""})
              </span>
            );
          })()}
        </span>
      )}
      {sustainability && !loading && (
        <>
          <span
            className={`inline-flex items-center border-2 border-[#111714] px-2 py-1 font-mono text-[0.65rem] font-semibold ${scoreColor(sustainability.score)}`}
          >
            {sustainability.score}/100
          </span>
          {sustainability.tags && sustainability.tags.length > 0 && (
            <span className="flex flex-wrap items-center gap-1">
              {(sustainability.tags.slice(0, 3)).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex border border-[#111714] bg-[#dfeef2] px-1.5 py-0.5 font-mono text-[0.58rem] font-semibold uppercase"
                >
                  {tag.replace(/-/g, " ")}
                </span>
              ))}
            </span>
          )}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center border-2 border-[#111714] bg-[#fffdf5] p-1 hover:bg-[#2148d8] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2148d8]"
            aria-expanded={expanded}
            aria-label={expanded ? "Hide details" : "Show details"}
          >
            <svg
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </>
      )}
      {expanded && sustainability && (
        <div className="mt-1 w-full border-2 border-[#111714] bg-[#fffdf5] p-4 text-sm">
          <p className="mb-2 font-mono text-[0.62rem] font-semibold uppercase">
            Verdict: {sustainability.verdict}
          </p>
          {sustainability.reasoning && (
            <p className="mb-3 leading-6 text-[#4c514b]">{sustainability.reasoning}</p>
          )}
          {(sustainability.confidence || sustainability.assessed_at) && (
            <p className="mb-3 font-mono text-[0.62rem] font-semibold uppercase">
              {sustainability.confidence ? `${sustainability.confidence} confidence` : ""}
              {sustainability.confidence && sustainability.assessed_at ? " / " : ""}
              {sustainability.assessed_at ? new Date(sustainability.assessed_at).toLocaleDateString() : ""}
            </p>
          )}
          {sustainability.sources && sustainability.sources.length > 0 && (
            <div className="mb-3 border-t-2 border-[#111714] pt-3">
              <p className="mb-2 font-mono text-[0.62rem] font-semibold uppercase">Evidence</p>
              <ol className="list-inside list-decimal space-y-1 text-[#4c514b]">
                {sustainability.sources.map((source) => (
                  <li key={source.id}>
                    <a href={source.url} target="_blank" rel="noreferrer" className="font-medium text-[#111714] underline decoration-2 underline-offset-2 hover:text-[#2148d8]">
                      {source.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {sustainability.better_alternatives.length > 0 && (
            <>
              <p className="mb-1 border-t-2 border-[#111714] pt-3 font-mono text-[0.62rem] font-semibold uppercase">
                Better alternatives
              </p>
              <ul className="list-inside list-square space-y-1 text-[#4c514b]">
                {sustainability.better_alternatives.map((alt, i) => (
                  <li key={i}>{alt}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingAssessment() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % ASSESSMENT_PROGRESS_STEPS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const progressStep = ASSESSMENT_PROGRESS_STEPS[stepIndex] ?? ASSESSMENT_PROGRESS_STEPS[0];
  return <AssessmentProgress step={progressStep} variant="compact" />;
}
