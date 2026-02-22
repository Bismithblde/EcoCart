"use client";

import { useState } from "react";
import type { ShoppingListSustainability } from "@/lib/shopping-list";

interface SustainabilityItemScoreProps {
  sustainability: ShoppingListSustainability | null;
  loading?: boolean;
  error?: string | null;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30";
  if (score >= 60) return "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30";
  if (score >= 40) return "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30";
  return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30";
}

export function SustainabilityItemScore({
  sustainability,
  loading = false,
  error = null,
}: SustainabilityItemScoreProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      {loading && (
        <span className="text-xs text-gray-500 dark:text-gray-400">Scoring…</span>
      )}
      {error && !loading && (
        <span className="text-xs text-red-600 dark:text-red-400" title={error}>
          Score unavailable
        </span>
      )}
      {sustainability && !loading && (
        <>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${scoreColor(sustainability.score)}`}
          >
            {sustainability.score}/100
          </span>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
        <div className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-3 text-sm mt-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Verdict: {sustainability.verdict}
          </p>
          {sustainability.reasoning && (
            <p className="text-gray-700 dark:text-gray-300 mb-2">{sustainability.reasoning}</p>
          )}
          {sustainability.better_alternatives.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Better alternatives
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-0.5">
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
