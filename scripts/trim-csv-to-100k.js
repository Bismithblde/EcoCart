/**
 * Trim the USA products CSV to 1 header + 100,000 data rows.
 * Reads from public/en.openfoodfacts.org.products.usa.csv and overwrites it.
 *
 * Usage: node scripts/trim-csv-to-100k.js [path-to-csv]
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

const MAX_DATA_ROWS = 100000;

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

  let isHeader = true;
  let dataRows = 0;

  rl.on("line", (line) => {
    if (isHeader) {
      writeStream.write(line + "\n");
      isHeader = false;
      return;
    }
    if (dataRows >= MAX_DATA_ROWS) return;
    writeStream.write(line + "\n");
    dataRows++;
    if (dataRows % 20000 === 0) {
      console.log(`Written ${dataRows.toLocaleString()} data rows...`);
    }
  });

  rl.on("close", () => {
    writeStream.end();
  });

  writeStream.on("finish", () => {
    fs.unlinkSync(csvPath);
    fs.renameSync(tmpPath, csvPath);
    console.log(`Done. Trimmed to 1 header + ${dataRows.toLocaleString()} data rows. File: ${csvPath}`);
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
