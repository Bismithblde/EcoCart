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
      <span className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" aria-hidden />
        <span>{step}</span>
      </span>
    );
  }

  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-6"
      role="status"
      aria-live="polite"
      aria-label={`Sustainability assessment in progress: ${step}`}
    >
      <div className="flex items-start gap-3">
        <Loader2
          className="h-6 w-6 animate-spin text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            Calculating sustainability score
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{step}</p>
          {steps.length > 0 && (
            <ul className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-2 ${
                    s === step ? "text-green-600 dark:text-green-400 font-medium" : ""
                  }`}
                >
                  {s === step ? (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  ) : (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
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
