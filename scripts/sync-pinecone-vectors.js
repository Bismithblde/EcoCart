/**
 * Sync product vectors to Pinecone for semantic search.
 * Embeds three separate features per product (only if non-empty): product_name, categories, brands.
 * Stores in Pinecone namespaces "name", "categories", "brand" so search can query and rank separately.
 * Default: first 100k rows (override with --limit=N).
 *
 * Env: OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME (default: hopperhacks),
 *      NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      MASTER_TABLE (default: api_items). If "products", uses column "code" as id.
 *
 * Usage: node scripts/sync-pinecone-vectors.js [--limit N]
 */

const path = require("path");
const fs = require("fs");

function loadEnv() {
  const roots = [path.join(__dirname, ".."), process.cwd()];
  for (const root of roots) {
    for (const name of [".env.local", ".env"]) {
      const p = path.join(root, name);
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf8");
        content.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) return;
          const eq = trimmed.indexOf("=");
          if (eq === -1) return;
          const key = trimmed.slice(0, eq).trim();
          const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
          if (key) process.env[key] = value;
        });
      }
    }
  }
}
loadEnv();

const EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_LIMIT = 100000;
const EMBED_BATCH = 50;
const PINECONE_UPSERT_BATCH = 100;
const PAGE_SIZE = 500;

const NAMESPACES = { name: "name", categories: "categories", brand: "brand" };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const pineconeKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX_NAME || "hopperhacks";
const masterTable = process.env.MASTER_TABLE || "api_items";
const idColumn = masterTable === "products" ? "code" : "id";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}
if (!openaiKey) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}
if (!pineconeKey) {
  console.error("Missing PINECONE_API_KEY");
  process.exit(1);
}

const { createClient } = require("@supabase/supabase-js");
const { Pinecone } = require("@pinecone-database/pinecone");

const supabase = createClient(supabaseUrl, supabaseKey);
const pinecone = new Pinecone({ apiKey: pineconeKey });
const index = pinecone.index(indexName);

async function embedBatch(texts) {
  const OpenAI = require("openai").default;
  const client = new OpenAI({ apiKey: openaiKey });
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    encoding_format: "float",
  });
  const ordered = (response.data || []).sort((a, b) => a.index - b.index);
  return ordered.map((d) => d.embedding);
}

async function upsertToNamespace(namespace, pairs) {
  if (pairs.length === 0) return;
  const texts = pairs.map((p) => p.text);
  const embeddings = await embedBatch(texts);
  for (let k = 0; k < pairs.length; k += PINECONE_UPSERT_BATCH) {
    const batch = pairs.slice(k, k + PINECONE_UPSERT_BATCH).map((p, j) => ({
      id: String(p.id),
      values: embeddings[k + j] ?? [],
      metadata: {},
    }));
    await index.namespace(namespace).upsert(batch);
  }
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : DEFAULT_LIMIT;

  let processed = 0;
  let errors = 0;

  console.log(`Syncing to Pinecone (index: ${indexName}, namespaces: name, categories, brand). Limit: ${limit}.`);

  let offset = 0;
  const fetchSize = Math.min(PAGE_SIZE, limit);

  while (true) {
    const cols = [idColumn, "product_name", "brands", "categories"].join(", ");
    const { data: rows, error } = await supabase
      .from(masterTable)
      .select(cols)
      .range(offset, offset + fetchSize - 1);

    if (error) {
      console.error("Supabase error:", error.message);
      errors += fetchSize;
      offset += fetchSize;
      if (offset >= limit) break;
      continue;
    }
    if (!rows || rows.length === 0) break;

    const items = rows.map((r) => ({
      id: r[idColumn],
      product_name: (r.product_name ?? "").trim(),
      brands: (r.brands ?? "").trim(),
      categories: (r.categories ?? "").trim(),
    })).filter((r) => r.id);

    const namePairs = [];
    const catPairs = [];
    const brandPairs = [];
    for (const r of items) {
      if (r.product_name) namePairs.push({ id: r.id, text: r.product_name });
      if (r.categories) catPairs.push({ id: r.id, text: r.categories });
      if (r.brands) brandPairs.push({ id: r.id, text: r.brands });
    }

    try {
      if (namePairs.length > 0) {
        for (let i = 0; i < namePairs.length; i += EMBED_BATCH) {
          const chunk = namePairs.slice(i, i + EMBED_BATCH);
          const texts = chunk.map((p) => p.text);
          const embeddings = await embedBatch(texts);
          for (let k = 0; k < chunk.length; k += PINECONE_UPSERT_BATCH) {
            const batch = chunk.slice(k, k + PINECONE_UPSERT_BATCH).map((p, j) => ({
              id: String(p.id),
              values: embeddings[k + j] ?? [],
              metadata: {},
            }));
            await index.namespace(NAMESPACES.name).upsert({ records: batch });
          }
        }
      }
      if (catPairs.length > 0) {
        for (let i = 0; i < catPairs.length; i += EMBED_BATCH) {
          const chunk = catPairs.slice(i, i + EMBED_BATCH);
          const texts = chunk.map((p) => p.text);
          const embeddings = await embedBatch(texts);
          for (let k = 0; k < chunk.length; k += PINECONE_UPSERT_BATCH) {
            const batch = chunk.slice(k, k + PINECONE_UPSERT_BATCH).map((p, j) => ({
              id: String(p.id),
              values: embeddings[k + j] ?? [],
              metadata: {},
            }));
            await index.namespace(NAMESPACES.categories).upsert({ records: batch });
          }
        }
      }
      if (brandPairs.length > 0) {
        for (let i = 0; i < brandPairs.length; i += EMBED_BATCH) {
          const chunk = brandPairs.slice(i, i + EMBED_BATCH);
          const texts = chunk.map((p) => p.text);
          const embeddings = await embedBatch(texts);
          for (let k = 0; k < chunk.length; k += PINECONE_UPSERT_BATCH) {
            const batch = chunk.slice(k, k + PINECONE_UPSERT_BATCH).map((p, j) => ({
              id: String(p.id),
              values: embeddings[k + j] ?? [],
              metadata: {},
            }));
            await index.namespace(NAMESPACES.brand).upsert({ records: batch });
          }
        }
      }
      processed += items.length;
      if (processed % 500 === 0 || processed === items.length) {
        console.log(`Processed ${processed} products (name/cat/brand vectors).`);
      }
    } catch (e) {
      console.error("Batch error:", e.message);
      errors += items.length;
    }

    offset += rows.length;
    if (rows.length < fetchSize || offset >= limit) break;
  }

  console.log(`Done. Processed: ${processed}, errors: ${errors}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
