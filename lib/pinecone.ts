/**
 * Pinecone vector store for semantic product search.
 * Vectors are keyed by product id (master DB id). Metadata: product_name, brands, categories.
 */

import { Pinecone } from "@pinecone-database/pinecone";

function getPinecone(): Pinecone {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("PINECONE_API_KEY is not set");
  }
  return new Pinecone({ apiKey });
}

export function getPineconeIndex() {
  const indexName = process.env.PINECONE_INDEX_NAME ?? "hopperhacks";
  return getPinecone().index(indexName);
}

export interface ProductVectorMeta {
  product_name?: string;
  brands?: string;
  categories?: string;
}

/**
 * Upsert vectors in batches (e.g. 100 at a time) to avoid timeouts.
 */
export async function upsertVectors(
  vectors: Array<{
    id: string;
    values: number[];
    metadata?: ProductVectorMeta;
  }>
): Promise<void> {
  const index = getPineconeIndex();
  const batchSize = 100;

  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize).map((v) => ({
      id: v.id,
      values: v.values,
      metadata: (v.metadata ?? {}) as Record<string, string | number | boolean>,
    }));
    await index.upsert({ records: batch });
  }
}

const SEARCH_NAMESPACES = ["name", "categories", "brand"] as const;
const DEFAULT_WEIGHTS = { name: 0.6, categories: 0.25, brand: 0.15 };

/**
 * Query top N similar vectors by embedding. Returns ids and scores.
 * (Used when not using per-feature namespaces.)
 */
export async function queryVectors(
  embedding: number[],
  topK: number = 24,
  filter?: Record<string, unknown>
): Promise<Array<{ id: string; score?: number; metadata?: ProductVectorMeta }>> {
  const index = getPineconeIndex();
  const result = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
    ...(filter && Object.keys(filter).length > 0 ? { filter } : {}),
  });

  return (result.matches ?? []).map((m) => ({
    id: m.id ?? "",
    score: m.score,
    metadata: (m.metadata ?? {}) as ProductVectorMeta,
  }));
}

/**
 * Query name, categories, and brand namespaces separately and merge by product id with weighted scores.
 * Returns product ids sorted by combined score: score = w.name*nameScore + w.categories*catScore + w.brand*brandScore.
 */
export async function queryVectorsMultiNamespace(
  embedding: number[],
  topK: number = 24,
  weights: { name?: number; categories?: number; brand?: number } = {}
): Promise<Array<{ id: string; score: number; nameScore: number; catScore: number; brandScore: number }>> {
  const index = getPineconeIndex();
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const topKPerNs = Math.max(topK, 30);

  const [nameRes, catRes, brandRes] = await Promise.all([
    index.namespace("name").query({ vector: embedding, topK: topKPerNs, includeMetadata: false }),
    index.namespace("categories").query({ vector: embedding, topK: topKPerNs, includeMetadata: false }),
    index.namespace("brand").query({ vector: embedding, topK: topKPerNs, includeMetadata: false }),
  ]);

  const byId = new Map<string, { nameScore: number; catScore: number; brandScore: number }>();

  function add(ns: "name" | "categories" | "brand", result: { matches?: Array<{ id?: string; score?: number }> }) {
    for (const m of result.matches ?? []) {
      const id = m.id ?? "";
      if (!id) continue;
      const s = typeof m.score === "number" ? m.score : 0;
      let entry = byId.get(id);
      if (!entry) {
        entry = { nameScore: 0, catScore: 0, brandScore: 0 };
        byId.set(id, entry);
      }
      if (ns === "name") entry.nameScore = s;
      else if (ns === "categories") entry.catScore = s;
      else entry.brandScore = s;
    }
  }

  add("name", nameRes);
  add("categories", catRes);
  add("brand", brandRes);

  const combined = Array.from(byId.entries()).map(([id, scores]) => ({
    id,
    nameScore: scores.nameScore,
    catScore: scores.catScore,
    brandScore: scores.brandScore,
    score:
      (w.name ?? 0) * scores.nameScore +
      (w.categories ?? 0) * scores.catScore +
      (w.brand ?? 0) * scores.brandScore,
  }));

  combined.sort((a, b) => b.score - a.score);
  return combined.slice(0, topK);
}

export type MultiNamespaceMatch = {
  id: string;
  score: number;
  nameScore: number;
  catScore: number;
  brandScore: number;
};

export const SEARCH_WEIGHTS = { name: 0.6, categories: 0.25, brand: 0.15 } as const;
