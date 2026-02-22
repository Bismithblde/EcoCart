/**
 * Embeddings via OpenAI (text-embedding-3-small) for semantic product search.
 */

import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

/**
 * Generate embeddings for one or more texts. Batches up to 50 texts per request to avoid timeouts.
 */
export async function embed(texts: string[]): Promise<number[][]> {
  const client = getClient();
  const batchSize = 50;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => (t || "").trim() || " ");
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      encoding_format: "float",
    });

    const ordered = (response.data ?? []).sort((a, b) => a.index - b.index);
    for (const item of ordered) {
      if (item.embedding) results.push(item.embedding);
    }
  }

  return results;
}

/**
 * Single-text convenience. For queries.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embed([text]);
  return vec ?? [];
}
