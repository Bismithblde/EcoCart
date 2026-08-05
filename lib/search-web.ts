/**
 * Server-side web search via Serper (Google Search API).
 * Used by the sustainability agent for multi-step research.
 * Set SERPER_API_KEY in env. See https://serper.dev
 */

const SERPER_BASE = "https://google.serper.dev/search";
const TIMEOUT_MS = 10_000;
const MAX_SNIPPETS = 6;

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
  error?: string;
}

export function getSerperApiKey(): string | null {
  const key = process.env.SERPER_API_KEY?.trim();
  return key || null;
}

/**
 * Run a web search and retain the source URLs so assessments can cite the
 * evidence shown to the model.
 */
export async function searchWeb(query: string): Promise<WebSearchResponse> {
  const trimmed = query.trim();
  const key = getSerperApiKey();
  if (!key) {
    return {
      query: trimmed,
      results: [],
      error: "SERPER_API_KEY is not set. Web search is disabled.",
    };
  }

  if (!trimmed) {
    return { query: trimmed, results: [], error: "Empty search query." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(SERPER_BASE, {
      method: "POST",
      headers: {
        "X-API-KEY": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: trimmed, num: 10 }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        query: trimmed,
        results: [],
        error: `Search failed (${res.status}): ${text.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as {
      organic?: Array<{ title?: string; snippet?: string; link?: string }>;
    };

    const results = (data.organic ?? [])
      .map((item) => ({
        title: item.title?.trim() ?? "",
        snippet: item.snippet?.trim() ?? "",
        url: item.link?.trim() ?? "",
      }))
      .filter((item) => item.title && /^https?:\/\//i.test(item.url))
      .slice(0, MAX_SNIPPETS);

    return {
      query: trimmed,
      results,
      ...(results.length === 0 ? { error: "No search results found." } : {}),
    };
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort")) {
      return { query: trimmed, results: [], error: "Search timed out." };
    }
    return {
      query: trimmed,
      results: [],
      error: `Search error: ${message.slice(0, 150)}`,
    };
  }
}
