/**
 * Seed Supabase api_items from en.openfoodfacts.org.products.usa.csv (TSV).
 * Replaces existing data: truncates api_items then upserts CSV rows in batches.
 *
 * Deduplication (case-insensitive): same product_name + same brand → keep first only.
 * Same product_name + no brand → keep first only. Prevents duplicates like "American cheese"
 * vs "american cheese" (Kraft) from both being inserted.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node scripts/seed-api-items-from-csv.js [path-to-usa.csv]
 * Default: public/en.openfoodfacts.org.products.usa.csv
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_CSV = path.join(
  __dirname,
  "..",
  "public",
  "en.openfoodfacts.org.products.usa.csv"
);

const BATCH_SIZE = 1000;
const PROGRESS_INTERVAL = 20000;

function parseNum(s) {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalize(value) {
  return (value || "").trim();
}

function normalizeName(value) {
  return normalize(value).toLowerCase();
}

async function main() {
  const csvPath = process.argv[2] || DEFAULT_CSV;
  if (!fs.existsSync(csvPath)) {
    console.error("CSV not found:", csvPath);
    process.exit(1);
  }

  console.log("Clearing existing api_items...");
  const DELETE_BATCH = 5000;
  let deleted = 0;
  while (true) {
    const { data: rows } = await supabase.from("api_items").select("id").limit(DELETE_BATCH);
    if (!rows || rows.length === 0) break;
    const ids = rows.map((r) => r.id);
    const { error: delError } = await supabase.from("api_items").delete().in("id", ids);
    if (delError) {
      console.error("Delete failed:", delError.message);
      process.exit(1);
    }
    deleted += rows.length;
    if (rows.length < DELETE_BATCH) break;
  }
  console.log(`Cleared ${deleted} existing rows. Loading from CSV...`);

  const readStream = fs.createReadStream(csvPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: readStream, crlfDelay: Infinity });

  let headers = null;
  let idxId = -1,
    idxProductName = -1,
    idxBrands = -1,
    idxCategories = -1,
    idxLabels = -1,
    idxIngredients = -1,
    idxAllergens = -1,
    idxQuantity = -1,
    idxEcoScore = -1,
    idxGrade = -1;
  let nutrimentStart = -1,
    nutrimentEnd = -1;
  let batch = [];
  let totalProcessed = 0;
  let totalInserted = 0;
  let duplicatesSkipped = 0;
  let errors = 0;
  /** Case-insensitive dedupe: "normName\tnormBrand". No brand = "". */
  const seen = new Set();

  function getVal(parts, i) {
    if (i < 0 || i >= parts.length) return null;
    const s = parts[i];
    return s === "" ? null : s;
  }

  function rowToRecord(parts) {
    const id = getVal(parts, idxId);
    if (!id) return null;
    const productName = getVal(parts, idxProductName);
    if (!productName || productName.trim() === "") return null;

    const nutriments = {};
    if (nutrimentStart >= 0 && nutrimentEnd >= 0) {
      for (let i = nutrimentStart; i <= nutrimentEnd; i++) {
        const v = getVal(parts, i);
        if (v != null && v !== "") {
          const num = parseNum(v);
          nutriments[headers[i]] = num !== null ? num : v;
        }
      }
    }

    return {
      id: id.trim(),
      product_name: productName.trim() || null,
      brands: getVal(parts, idxBrands)?.trim() || null,
      categories: getVal(parts, idxCategories)?.trim() || null,
      labels: getVal(parts, idxLabels)?.trim() || null,
      ingredients: getVal(parts, idxIngredients)?.trim() || null,
      allergens: getVal(parts, idxAllergens)?.trim() || null,
      quantity: getVal(parts, idxQuantity)?.trim() || null,
      eco_score: parseNum(getVal(parts, idxEcoScore)),
      grade: getVal(parts, idxGrade)?.trim() || null,
      nutriments: Object.keys(nutriments).length ? nutriments : {},
    };
  }

  async function flushBatch() {
    if (batch.length === 0) return;
    const toInsert = batch;
    batch = [];
    const { error } = await supabase.from("api_items").upsert(toInsert, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error("Batch upsert error:", error.message);
      errors += toInsert.length;
    } else {
      totalInserted += toInsert.length;
    }
  }

  rl.on("line", async (line) => {
    if (!headers) {
      headers = line.split("\t");
      idxId = headers.indexOf("id");
      idxProductName = headers.indexOf("product_name");
      idxBrands = headers.indexOf("brands");
      idxCategories = headers.indexOf("categories");
      idxLabels = headers.indexOf("labels");
      idxIngredients = headers.indexOf("ingredients");
      idxAllergens = headers.indexOf("allergens");
      idxQuantity = headers.indexOf("quantity");
      idxEcoScore = headers.indexOf("eco_score");
      idxGrade = headers.indexOf("grade");
      nutrimentStart = headers.indexOf("energy-kj_100g");
      if (nutrimentStart === -1) nutrimentStart = headers.indexOf("energy_100g");
      const qIdx = headers.indexOf("quantity");
      nutrimentEnd = qIdx > 0 && nutrimentStart >= 0 ? qIdx - 1 : nutrimentStart >= 0 ? headers.length - 1 : -1;
      console.log("Columns: id=%s product_name=%s ...", idxId, idxProductName);
      return;
    }

    const parts = line.split("\t");
    const record = rowToRecord(parts);
    if (!record) return;
    totalProcessed++;

    const normName = normalizeName(record.product_name);
    const normBrand = normalize(record.brands || "");
    const key = normName + "\t" + normBrand;
    if (seen.has(key)) {
      duplicatesSkipped++;
      return;
    }
    seen.add(key);
    batch.push(record);

    if (batch.length >= BATCH_SIZE) {
      rl.pause();
      await flushBatch();
      rl.resume();
    }
    if (totalProcessed % PROGRESS_INTERVAL === 0) {
      console.log(
        `Processed ${totalProcessed.toLocaleString()} rows, inserted ${totalInserted.toLocaleString()} (${duplicatesSkipped.toLocaleString()} duplicates skipped)`
      );
    }
  });

  rl.on("close", async () => {
    await flushBatch();
    console.log(
      `Done. Processed: ${totalProcessed.toLocaleString()}, inserted: ${totalInserted.toLocaleString()}, duplicates skipped: ${duplicatesSkipped.toLocaleString()}, errors: ${errors}`
    );
  });

  readStream.on("error", (err) => {
    console.error("Read error:", err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
