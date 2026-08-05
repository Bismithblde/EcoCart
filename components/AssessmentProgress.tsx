"use client";

import type { AssessmentProgressState } from "@/hooks/useAnalyzeSustainability";
import { ASSESSMENT_PROGRESS_STAGES } from "@/lib/sustainability-types";

export interface AssessmentProgressProps {
  progress: AssessmentProgressState;
  productName?: string;
  variant?: "compact" | "full";
  onCancel?: () => void;
}

export function AssessmentProgress({
  progress,
  productName,
  variant = "full",
  onCancel,
}: AssessmentProgressProps) {
  const completed = new Set(progress.completedStages);

  if (variant === "compact") {
    return (
      <span
        className="inline-flex min-w-0 items-center gap-2 font-mono text-[0.65rem] font-semibold text-[#0d563f]"
        role="status"
        aria-live="polite"
      >
        <span
          className="h-2 w-2 shrink-0 bg-[#0d563f] motion-safe:animate-pulse motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span className="truncate">{progress.message}</span>
        {progress.evidenceCount > 0 ? (
          <span className="shrink-0 text-[#4c514b]">
            {progress.evidenceCount} {progress.evidenceCount === 1 ? "source" : "sources"}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <section
      className="border-2 border-[#111714] bg-[#fffdf5] text-[#111714]"
      role="status"
      aria-live="polite"
      aria-label={`Sustainability assessment in progress: ${progress.message}`}
    >
      <header className="grid grid-cols-[1fr_auto] border-b-2 border-[#111714]">
        <div className="min-w-0 p-4 sm:p-5">
          <p className="font-mono text-[0.64rem] font-semibold text-[#0d563f]">
            RESEARCH RECEIPT / LIVE
          </p>
          <p className="mt-2 truncate text-lg font-semibold sm:text-xl">
            {productName || "Selected product"}
          </p>
        </div>
        <div className="flex min-w-28 items-end justify-between border-l-2 border-[#111714] bg-[#dfeef2] p-4 sm:min-w-36 sm:p-5">
          <span
            className="text-3xl font-semibold tracking-[-0.06em] motion-safe:animate-pulse motion-reduce:animate-none sm:text-4xl"
            aria-label="Score pending"
          >
            --
          </span>
          <span className="font-mono text-[0.62rem] font-semibold">/100</span>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_15rem]">
        <ol className="divide-y-2 divide-[#111714]">
          {ASSESSMENT_PROGRESS_STAGES.map((stage, index) => {
            const isComplete = completed.has(stage.id);
            const isActive = progress.stage === stage.id && progress.status === "active";
            return (
              <li
                key={stage.id}
                className={`grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3 sm:px-5 ${
                  isActive ? "bg-[#dfeef2]" : "bg-[#fffdf5]"
                }`}
              >
                <span className="font-mono text-[0.62rem] font-semibold text-[#4c514b]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-semibold">{stage.label}</span>
                <span
                  className={`font-mono text-[0.58rem] font-semibold ${
                    isActive ? "text-[#0d563f]" : "text-[#4c514b]"
                  }`}
                >
                  {isActive ? "NOW" : isComplete ? "DONE" : "WAIT"}
                </span>
              </li>
            );
          })}
        </ol>

        <aside className="border-t-2 border-[#111714] bg-[#0d563f] p-4 text-white sm:border-l-2 sm:border-t-0 sm:p-5">
          <p className="font-mono text-[0.62rem] font-semibold">ACTIVE TASK</p>
          <p className="mt-3 text-sm font-semibold leading-5">{progress.message}</p>
          <p className="mt-6 font-mono text-[0.62rem] font-semibold text-[#dfeef2]">
            EVIDENCE / {progress.evidenceCount}
          </p>
          {progress.researchRound && progress.maxResearchRounds ? (
            <p className="mt-2 font-mono text-[0.62rem] font-semibold text-[#dfeef2]">
              PASS / {progress.researchRound} OF {progress.maxResearchRounds}
            </p>
          ) : null}
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="mt-4 border-2 border-white px-3 py-2 font-mono text-[0.62rem] font-semibold transition-colors hover:bg-white hover:text-[#0d563f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d563f]"
            >
              CANCEL
            </button>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
