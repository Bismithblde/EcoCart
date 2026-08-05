"use client";

import { Loader2 } from "lucide-react";

export interface AssessmentProgressProps {
  /** Current step label (e.g. "Checking environmental impact…") */
  step: string;
  /** All steps for optional step list UI */
  steps?: readonly string[];
  /** Compact: single line with spinner. Full: card with step list. */
  variant?: "compact" | "full";
}

export function AssessmentProgress({
  step,
  steps = [],
  variant = "full",
}: AssessmentProgressProps) {
  if (variant === "compact") {
    return (
      <span className="inline-flex items-center gap-2 font-mono text-[0.65rem] font-semibold text-[#0d563f]">
        <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" aria-hidden />
        <span>{step}</span>
      </span>
    );
  }

  return (
    <div
      className="border-2 border-[#111714] bg-[#fffdf5] p-5 text-[#111714]"
      role="status"
      aria-live="polite"
      aria-label={`Sustainability assessment in progress: ${step}`}
    >
      <div className="flex items-start gap-3">
        <Loader2
          className="mt-0.5 h-6 w-6 flex-shrink-0 animate-spin text-[#0d563f]"
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <p className="mb-1 font-mono text-[0.68rem] font-semibold">
            CALCULATING / IMPACT SCORE
          </p>
          <p className="mb-3 text-sm text-[#4c514b]">{step}</p>
          {steps.length > 0 && (
            <ul className="grid gap-px border-2 border-[#111714] bg-[#111714] font-mono text-[0.62rem] sm:grid-cols-2">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-2 bg-[#fffdf5] p-2 ${s === step ? "font-semibold text-[#0d563f]" : "text-[#727873]"}`}
                >
                  {s === step ? (
                    <span className="inline-block h-1.5 w-1.5 animate-pulse bg-[#0d563f]" />
                  ) : (
                    <span className="inline-block h-1.5 w-1.5 bg-[#b7c4c4]" />
                  )}
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
