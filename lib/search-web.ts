/**
 * Server-side web search via Serper (Google Search API).
 * Used by the sustainability agent for multi-step research.
 * Set SERPER_API_KEY in env. See https://serper.dev
 */

const SERPER_BASE = "https://google.serper.dev/search";
const TIMEOUT_MS = 10_000;
const MAX_SNIPPETS = 8;

export function getSerperApiKey(): string | null {
  const key = process.env.SERPER_API_KEY?.trim();
  return key || null;
}

/**
 * Run a web search and return a short text summary (titles + snippets) for the LLM.
 * Returns an error message string if the key is missing or the request fails.
 */
export async function searchWeb(query: string): Promise<string> {
  const key = getSerperApiKey();
  if (!key) {
    return "Error: SERPER_API_KEY is not set. Web search is disabled.";
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return "Error: Empty search query.";
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
      return `Search failed (${res.status}): ${text.slice(0, 200)}`;
    }

    const data = (await res.json()) as {
      organic?: Array<{ title?: string; snippet?: string; link?: string }>;
    };

    const organic = data.organic ?? [];
    const parts: string[] = [];
    for (let i = 0; i < Math.min(organic.length, MAX_SNIPPETS); i++) {
      const o = organic[i];
      const title = o?.title ?? "";
      const snippet = o?.snippet ?? "";
      if (title || snippet) {
        parts.push(`[${i + 1}] ${title}\n${snippet}`);
      }
    }

    if (parts.length === 0) {
      return "No search results found.";
    }

    return parts.join("\n\n");
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort")) {
      return "Search timed out.";
    }
    return `Search error: ${message.slice(0, 150)}`;
  }
}
