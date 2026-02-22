/**
 * Seed Supabase `products` table from en.openfoodfacts.org.products.usa.csv (TSV).
 * Streams the file and upserts in batches. Requires products table migration to be applied.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 * Loads .env.local and .env from project root if present.
 *
 * Usage: node scripts/seed-products-from-csv.js [path-to-usa.csv]
 * Default path: public/en.openfoodfacts.org.products.usa.csv
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Load .env.local and .env from project root (script dir) or cwd
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
  console.error("Missing env for seeding:");
  if (!SUPABASE_URL) console.error("  - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("  - SUPABASE_SERVICE_ROLE_KEY (not the anon key)");
    console.error("    Get it: Supabase Dashboard → Project Settings → API → service_role secret.");
    console.error("    Add to .env or .env.local: SUPABASE_SERVICE_ROLE_KEY=your-service-role-key");
  }
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
const PROGRESS_INTERVAL = 50000;

function parseNum(s) {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function main() {
  const csvPath = process.argv[2] || DEFAULT_CSV;
  if (!fs.existsSync(csvPath)) {
    console.error("CSV not found:", csvPath);
    process.exit(1);
  }

  const readStream = fs.createReadStream(csvPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: readStream, crlfDelay: Infinity });

  let headers = null;
  let idxCode = -1,
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
  let errors = 0;

  function getVal(parts, i) {
    if (i < 0 || i >= parts.length) return null;
    const s = parts[i];
    return s === "" ? null : s;
  }

  function rowToRecord(parts) {
    const code = getVal(parts, idxCode);
    if (!code) return null;
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
      code: code.trim(),
      product_name: productName.trim() || null,
      brands: getVal(parts, idxBrands)?.trim() || null,
      categories: getVal(parts, idxCategories)?.trim() || null,
      labels: getVal(parts, idxLabels)?.trim() || null,
      ingredients_text: getVal(parts, idxIngredients)?.trim() || null,
      allergens: getVal(parts, idxAllergens)?.trim() || null,
      quantity: getVal(parts, idxQuantity)?.trim() || null,
      ecoscore_grade: getVal(parts, idxGrade)?.trim() || null,
      ecoscore_score: parseNum(getVal(parts, idxEcoScore)),
      nutriments: Object.keys(nutriments).length ? nutriments : {},
    };
  }

  async function flushBatch() {
    if (batch.length === 0) return;
    const toInsert = batch;
    batch = [];
    const { error } = await supabase.from("products").upsert(toInsert, {
      onConflict: "code",
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
      idxCode = headers.indexOf("id");
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
      console.log("Columns: code=%s product_name=%s ... nutriments %s..%s", idxCode, idxProductName, nutrimentStart, nutrimentEnd);
      return;
    }

    const parts = line.split("\t");
    const record = rowToRecord(parts);
    if (!record) return;
    batch.push(record);
    totalProcessed++;

    if (batch.length >= BATCH_SIZE) {
      rl.pause();
      await flushBatch();
      rl.resume();
    }
    if (totalProcessed % PROGRESS_INTERVAL === 0) {
      console.log(`Processed ${totalProcessed.toLocaleString()} rows, inserted ${totalInserted.toLocaleString()}`);
    }
  });

  rl.on("close", async () => {
    await flushBatch();
    console.log(
      `Done. Total processed: ${totalProcessed.toLocaleString()}, inserted: ${totalInserted.toLocaleString()}, errors: ${errors}`
    );
  });

  readStream.on("error", (err) => {
    console.error("Read error:", err);
    process.exit(1);
  });
}

main();
