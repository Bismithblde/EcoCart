/**
 * Filter Open Food Facts CSV to USA-only products.
 * Reads from the full (non-USA) products CSV, keeps only USA rows, extracts the same
 * features: id (code), product_name, brands, categories, labels, ingredients, allergens,
 * nutriments (all _100g etc.), quantity, eco_score, grade. Excludes rows without a product name.
 *
 * Deduplication (before hitting the row cap):
 * - Same product_name + same brand → keep one, drop the rest.
 * - Same product_name + no brand → keep one, drop the rest.
 *
 * Stops after writing 200,000 deduplicated USA rows.
 *
 * Usage: node scripts/filter-csv-usa.js [input.csv] [output.csv]
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const DEFAULT_INPUT = path.join(
  __dirname,
  "..",
  "public",
  "en.openfoodfacts.org.products.csv"
);
const DEFAULT_OUTPUT = path.join(
  __dirname,
  "..",
  "public",
  "en.openfoodfacts.org.products.usa.csv"
);

const USA_TAG = "en:united-states";
const PROGRESS_INTERVAL = 100000;
const MAX_OUTPUT_ROWS = 200000;

function normalize(value) {
  return (value || "").trim();
}

function normalizeName(value) {
  return normalize(value).toLowerCase();
}

/** Source columns before nutriments block (output name in comment). */
const SOURCE_COLS_BEFORE_NUTRIMENTS = [
  "code",           // id
  "product_name",   // product_name
  "brands",         // brands
  "categories",     // categories
  "labels",         // labels
  "ingredients_text", // ingredients
  "allergens",      // allergens
];
/** Source columns after nutriments block. */
const SOURCE_COLS_AFTER_NUTRIMENTS = [
  "quantity",                      // quantity
  "environmental_score_score",     // eco_score
  "environmental_score_grade",     // grade
];
const NUTRIMENTS_START = "energy-kj_100g";

/** Output header names for SOURCE_COLS_BEFORE_NUTRIMENTS (same order). */
const OUT_HEADERS_BEFORE_NUTRIMENTS = [
  "id", "product_name", "brands", "categories", "labels", "ingredients", "allergens",
];
const OUT_HEADERS_AFTER_NUTRIMENTS = ["quantity", "eco_score", "grade"];

function main() {
  const inputPath = process.argv[2] || DEFAULT_INPUT;
  const outputPath = process.argv[3] || DEFAULT_OUTPUT;

  if (!fs.existsSync(inputPath)) {
    console.error("Input file not found:", inputPath);
    process.exit(1);
  }

  const readStream = fs.createReadStream(inputPath, { encoding: "utf8" });
  const writeStream = fs.createWriteStream(outputPath, { encoding: "utf8" });

  const rl = readline.createInterface({ input: readStream, crlfDelay: Infinity });

  let isHeader = true;
  let linesProcessed = 0;
  let linesWritten = 0;
  let duplicatesSkipped = 0;
  let countriesTagsIndex = 40;
  /** Indices into row parts to output (in order). */
  let outIndices = null;
  /** Index of product_name column (for filtering out empty names and dedupe). */
  let productNameIndex = -1;
  /** Index of brands column (for dedupe). */
  let brandsIndex = -1;
  /** Set of "normName\tnormBrand" for dedupe. No brand = empty string. */
  const seen = new Set();

  rl.on("line", (line) => {
    if (isHeader) {
      const headers = line.split("\t");
      const idx = headers.indexOf("countries_tags");
      if (idx !== -1) {
        countriesTagsIndex = idx;
      }
      productNameIndex = headers.indexOf("product_name");
      brandsIndex = headers.indexOf("brands");
      const nutrimentsStartIdx = headers.indexOf(NUTRIMENTS_START);
      outIndices = [];
      for (const name of SOURCE_COLS_BEFORE_NUTRIMENTS) {
        const i = headers.indexOf(name);
        outIndices.push(i !== -1 ? i : -1);
      }
      const outHeaderNames = [...OUT_HEADERS_BEFORE_NUTRIMENTS];
      if (nutrimentsStartIdx !== -1) {
        for (let i = nutrimentsStartIdx; i < headers.length; i++) {
          outIndices.push(i);
          outHeaderNames.push(headers[i]);
        }
      }
      for (const name of SOURCE_COLS_AFTER_NUTRIMENTS) {
        const i = headers.indexOf(name);
        outIndices.push(i !== -1 ? i : -1);
      }
      outHeaderNames.push(...OUT_HEADERS_AFTER_NUTRIMENTS);
      writeStream.write(outHeaderNames.join("\t") + "\n");
      isHeader = false;
      return;
    }

    if (linesWritten >= MAX_OUTPUT_ROWS) return;

    linesProcessed++;
    const parts = line.split("\t");
    if (parts.length <= countriesTagsIndex) {
      return;
    }
    const countriesTags = parts[countriesTagsIndex];
    if (
      typeof countriesTags !== "string" ||
      !countriesTags.includes(USA_TAG)
    ) {
      return;
    }
    if (productNameIndex < 0 || productNameIndex >= parts.length) {
      return;
    }
    const name = parts[productNameIndex];
    if (typeof name !== "string" || name.trim() === "") {
      return;
    }
    const brand = brandsIndex >= 0 && parts[brandsIndex] !== undefined ? parts[brandsIndex] : "";
    const normName = normalizeName(name);
    const normBrand = normalize(brand);
    const key = normName + "\t" + normBrand;

    if (seen.has(key)) {
      duplicatesSkipped++;
      return;
    }
    seen.add(key);

    const outParts = outIndices.map((i) =>
      i >= 0 && parts[i] !== undefined ? parts[i] : ""
    );
    writeStream.write(outParts.join("\t") + "\n");
    linesWritten++;

    if (linesProcessed % PROGRESS_INTERVAL === 0) {
      console.log(
        `Processed ${linesProcessed.toLocaleString()} lines, written ${linesWritten.toLocaleString()} USA rows (${duplicatesSkipped.toLocaleString()} duplicates skipped)`
      );
    }
  });

  rl.on("close", () => {
    writeStream.end();
    console.log(
      `Done. Processed ${linesProcessed.toLocaleString()} lines, wrote ${linesWritten.toLocaleString()} USA rows (${duplicatesSkipped.toLocaleString()} duplicates removed) to ${outputPath}`
    );
  });

  writeStream.on("error", (err) => {
    console.error("Write error:", err);
    process.exit(1);
  });

  readStream.on("error", (err) => {
    console.error("Read error:", err);
    process.exit(1);
  });
}

main();
