/**
 * Trim the USA products CSV to 1 header + up to 200,000 data rows, with deduplication:
 * - Same product_name + same brand → keep one, drop the rest.
 * - Same product_name + no brand → keep one, drop the rest.
 *
 * Reads from public/en.openfoodfacts.org.products.usa.csv and overwrites it.
 * Expects tab-separated columns: id, product_name, brands, ...
 *
 * Usage: node scripts/trim-csv-to-200k.js [path-to-csv]
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const DEFAULT_CSV = path.join(
  __dirname,
  "..",
  "public",
  "en.openfoodfacts.org.products.usa.csv"
);

const MAX_DATA_ROWS = 200000;
const NAME_INDEX = 1;
const BRAND_INDEX = 2;

function normalize(value) {
  return (value || "").trim();
}

function normalizeName(value) {
  return normalize(value).toLowerCase();
}

function main() {
  const csvPath = process.argv[2] || DEFAULT_CSV;
  if (!fs.existsSync(csvPath)) {
    console.error("File not found:", csvPath);
    process.exit(1);
  }

  const tmpPath = csvPath + ".trimmed.tmp";
  const readStream = fs.createReadStream(csvPath, { encoding: "utf8" });
  const writeStream = fs.createWriteStream(tmpPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: readStream, crlfDelay: Infinity });

  /** Set of "name\tbrand" for dedupe. No brand = empty string. */
  const seen = new Set();
  let isHeader = true;
  let dataRows = 0;
  let linesRead = 0;
  let duplicatesSkipped = 0;

  rl.on("line", (line) => {
    if (isHeader) {
      writeStream.write(line + "\n");
      isHeader = false;
      return;
    }

    if (dataRows >= MAX_DATA_ROWS) return;

    linesRead++;
    const parts = line.split("\t");
    const name = parts.length > NAME_INDEX ? parts[NAME_INDEX] : "";
    const brand = parts.length > BRAND_INDEX ? parts[BRAND_INDEX] : "";
    const normName = normalizeName(name);
    const normBrand = normalize(brand);
    const key = normName + "\t" + normBrand;

    if (seen.has(key)) {
      duplicatesSkipped++;
      return;
    }
    seen.add(key);
    writeStream.write(line + "\n");
    dataRows++;

    if (dataRows % 50000 === 0) {
      console.log(`Written ${dataRows.toLocaleString()} rows (${duplicatesSkipped.toLocaleString()} duplicates skipped)...`);
    }
  });

  rl.on("close", () => {
    writeStream.end();
  });

  writeStream.on("finish", () => {
    fs.unlinkSync(csvPath);
    fs.renameSync(tmpPath, csvPath);
    console.log(
      `Done. Trimmed to 1 header + ${dataRows.toLocaleString()} data rows. ` +
        `Duplicates removed: ${duplicatesSkipped.toLocaleString()}. File: ${csvPath}`
    );
  });

  readStream.on("error", (err) => {
    console.error("Read error:", err);
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    process.exit(1);
  });
  writeStream.on("error", (err) => {
    console.error("Write error:", err);
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    process.exit(1);
  });
}

main();
