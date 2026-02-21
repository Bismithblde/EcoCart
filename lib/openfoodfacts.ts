/**
 * Open Food Facts API client for sustainability and health classification data.
 * @see https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

const OFF_API_BASE = "https://world.openfoodfacts.org/api/v2";
const USER_AGENT = "HopperHacks-Project/1.0 (contact@example.com)";

/** Fields needed for AI sustainability/health classification */
const PRODUCT_FIELDS = [
  "code",
  "product_name",
  "brands",
  "categories",
  "nutriscore_grade",
  "nutriscore_score",
  "ecoscore_grade",
  "ecoscore_score",
  "nova_group",
  "nova_groups_tags",
  "ingredients_text",
  "allergens",
  "allergens_tags",
  "additives_tags",
  "labels_tags",
  "ingredients_analysis_tags",
].join(",");

export interface OffClassificationData {
  code: string;
  product_name?: string;
  brands?: string;
  nutriscore_grade?: string;
  nutriscore_score?: number;
  ecoscore_grade?: string;
  ecoscore_score?: number;
  nova_group?: number;
  ingredients_text?: string;
  allergens?: string[];
  additives?: string[];
  labels?: string[];
  /** True if enough data exists for AI sustainability/health classification */
  sufficient_for_classification: boolean;
}

/**
 * Check if OFF product data has enough fields for AI classification.
 * Requires at least: Nutri-Score, Eco-Score, NOVA group, or substantial ingredients/allergens.
 */
export function isSufficientForClassification(product: Record<string, unknown>): boolean {
  const hasNutriScore = !!product.nutriscore_grade || product.nutriscore_score != null;
  const hasEcoScore = !!product.ecoscore_grade || product.ecoscore_score != null;
  const hasNova = product.nova_group != null;
  const hasIngredients =
    typeof product.ingredients_text === "string" && product.ingredients_text.trim().length > 20;
  const hasAllergens =
    Array.isArray(product.allergens_tags) &&
    product.allergens_tags.length > 0 &&
    !product.allergens_tags.includes("en:none");

  return hasNutriScore || hasEcoScore || hasNova || hasIngredients || hasAllergens;
}

/**
 * Extract structured classification data from Open Food Facts product response.
 */
export function extractClassificationData(product: Record<string, unknown>): OffClassificationData {
  const sufficient = isSufficientForClassification(product);
  return {
    code: String(product.code ?? ""),
    product_name: typeof product.product_name === "string" ? product.product_name : undefined,
    brands: typeof product.brands === "string" ? product.brands : undefined,
    nutriscore_grade:
      typeof product.nutriscore_grade === "string" ? product.nutriscore_grade : undefined,
    nutriscore_score:
      typeof product.nutriscore_score === "number" ? product.nutriscore_score : undefined,
    ecoscore_grade:
      typeof product.ecoscore_grade === "string" ? product.ecoscore_grade : undefined,
    ecoscore_score:
      typeof product.ecoscore_score === "number" ? product.ecoscore_score : undefined,
    nova_group: typeof product.nova_group === "number" ? product.nova_group : undefined,
    ingredients_text:
      typeof product.ingredients_text === "string" ? product.ingredients_text : undefined,
    allergens: Array.isArray(product.allergens_tags) ? product.allergens_tags : undefined,
    additives: Array.isArray(product.additives_tags) ? product.additives_tags : undefined,
    labels: Array.isArray(product.labels_tags) ? product.labels_tags : undefined,
    sufficient_for_classification: sufficient,
  };
}

const OFF_SEARCH_BASE = "https://world.openfoodfacts.org/cgi/search.pl";

/** Fetch options with required User-Agent for OFF API */
const fetchOptions = {
  headers: { "User-Agent": USER_AGENT } as Record<string, string>,
};

export interface OffSearchResult {
  count: number;
  page: number;
  page_size: number;
  products: Array<Record<string, unknown>>;
}

/** Processed product indicators in ingredients - excludes mayo, cakes, etc. */
const PROCESSED_INGREDIENT_PATTERNS = [
  /mayonnaise/i,
  /mayo\b/i,
  /\bflour\b/i,
  /\bsugar\b/i,
  /\bvinegar\b/i,
  /\bstarch\b/i,
  /\bcake\b/i,
  /\bcookie/i,
  /\bbread\b/i,
  /\bwheat\b/i,
  /\boil\b.*\boil\b/i,
  /\bsoybean\b/i,
  /\bcanola\b/i,
  /\bvegetable oil\b/i,
  /\brapeseed oil\b/i,
  /\bolive oil\b/i,
  /\bmodified\s+(food\s+)?starch/i,
  /\bxanthan\b/i,
  /\bguar gum\b/i,
];

/** Max ingredients length for "real eggs" - short = whole eggs only. */
const REAL_EGGS_INGREDIENTS_MAX_LEN = 80;

/**
 * Check if product categories include Eggs or Chicken eggs.
 */
function hasEggCategory(product: Record<string, unknown>): boolean {
  const categories = [
    String(product.categories ?? ""),
    Array.isArray(product.categories_tags)
      ? (product.categories_tags as string[]).join(" ")
      : "",
  ].join(" ");
  const lower = categories.toLowerCase();
  return (
    lower.includes("eggs") ||
    lower.includes("chicken eggs") ||
    lower.includes("chicken-eggs") ||
    lower.includes("en:eggs")
  );
}

/**
 * Check if ingredients_text indicates real eggs only (not processed products).
 * Excludes mayo, cakes, etc. based on ingredient patterns.
 */
function hasRealEggsOnlyIngredients(product: Record<string, unknown>): boolean {
  const text = String(product.ingredients_text ?? "").trim();
  if (!text) return true;
  if (text.length > REAL_EGGS_INGREDIENTS_MAX_LEN) return false;
  const lower = text.toLowerCase();
  if (!lower.includes("egg")) return false;
  return !PROCESSED_INGREDIENT_PATTERNS.some((re) => re.test(text));
}

/**
 * Prioritize products so strict matches (product IS the searched item) rank above
 * products that only contain the term as a secondary ingredient.
 */
export function prioritizeByStrictMatch(
  products: Array<Record<string, unknown>>,
  searchTerm: string
): Array<Record<string, unknown>> {
  const term = searchTerm.trim().toLowerCase();
  const words = term.split(/\s+/).filter(Boolean);
  const primaryTerm = words[words.length - 1] ?? term;

  function score(p: Record<string, unknown>): number {
    let s = 0;
    const name = String(p.product_name ?? "").toLowerCase();
    const categories = String(p.categories ?? "").toLowerCase();
    const catTags = Array.isArray(p.categories_tags)
      ? (p.categories_tags as string[]).join(" ").toLowerCase()
      : "";
    const ingredients = String(p.ingredients_text ?? "").trim();

    const nameHasPrimary = name.includes(primaryTerm);
    const catsHavePrimary =
      categories.includes(primaryTerm) || catTags.includes(primaryTerm);
    const ingredientsHavePrimary = ingredients.toLowerCase().includes(primaryTerm);
    const ingredientsShort = ingredients.length > 0 && ingredients.length <= 60;

    if (nameHasPrimary) {
      if (name.startsWith(primaryTerm) || new RegExp(`\\b${primaryTerm}\\b`).test(name))
        s += 80;
      else s += 40;
    }
    if (catsHavePrimary) {
      const firstCats = (categories + " " + catTags).slice(0, 80);
      if (firstCats.includes(primaryTerm)) s += 50;
      else s += 20;
    }
    if (ingredientsShort && ingredientsHavePrimary) s += 60;
    else if (ingredients.length > 80 && ingredientsHavePrimary) s -= 40;

    if (primaryTerm === "eggs") {
      if (PROCESSED_INGREDIENT_PATTERNS.some((re) => re.test(ingredients))) s -= 70;
      if (hasEggCategory(p) && ingredientsShort) s += 30;
    }
    if (primaryTerm === "gum") {
      const isChewingGum =
        /chewing gum|bubble gum|gum\s*$/i.test(name) ||
        /chewing.gum|en:chewing-gums/i.test(categories + catTags);
      if (isChewingGum) s += 90;
      const gumOnlyInAdditives =
        !nameHasPrimary &&
        !isChewingGum &&
        (/\bgum arabic|xanthan gum|guar gum|gellan gum|locust bean gum\b/i.test(
          ingredients
        ) ||
          (Array.isArray(p.additives_tags) &&
            (p.additives_tags as string[]).some((t) => t.includes("gum"))));
      if (gumOnlyInAdditives) s -= 60;
    }

    return s;
  }

  return [...products].sort((a, b) => score(b) - score(a));
}

/**
 * Filter products to real eggs only (whole eggs, not mayo/cakes/processed).
 * Rules: categories must contain "Eggs" or "Chicken eggs"; optionally exclude by ingredients.
 */
export function filterRealEggsOnly(
  products: Array<Record<string, unknown>>,
  opts?: { checkIngredients?: boolean }
): Array<Record<string, unknown>> {
  const checkIngredients = opts?.checkIngredients ?? true;
  return products.filter((p) => {
    if (!hasEggCategory(p)) return false;
    if (checkIngredients && !hasRealEggsOnlyIngredients(p)) return false;
    return true;
  });
}

/**
 * Normalize country value to OFF tag format (e.g., "united-states" -> "en:united-states").
 */
function toCountryTag(country: string): string {
  const trimmed = country.trim().toLowerCase().replace(/\s+/g, "-");
  return trimmed.startsWith("en:") ? trimmed : `en:${trimmed}`;
}

/**
 * Search Open Food Facts by keyword.
 * Rate limit: 10 req/min. Use fields param to reduce payload.
 */
export async function search(
  searchTerms: string,
  opts?: {
    page?: number;
    pageSize?: number;
    brand?: string;
    country?: string;
    /** Filter to real eggs only (exclude mayo, cakes, etc.) */
    realEggsOnly?: boolean;
  }
): Promise<OffSearchResult> {
  const params = new URLSearchParams({
    search_terms: searchTerms.trim(),
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(opts?.pageSize ?? 24),
    page: String(opts?.page ?? 1),
    fields: [
      "code",
      "product_name",
      "brands",
      "categories",
      "nutriscore_grade",
      "nutriscore_score",
      "ecoscore_grade",
      "ecoscore_score",
      "nova_group",
      "ingredients_text",
      "allergens_tags",
      "additives_tags",
      "labels_tags",
      "image_url",
      "image_small_url",
    ].join(","),
  });

  if (opts?.brand?.trim()) {
    params.set("brands_tags", opts.brand.trim());
  }

  if (opts?.country?.trim()) {
    const countryTag = toCountryTag(opts.country);
    params.set("tagtype_0", "countries");
    params.set("tag_contains_0", "contains");
    params.set("tag_0", countryTag);
  }

  const url = `${OFF_SEARCH_BASE}?${params.toString()}`;
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        if (res.status === 504 || res.status === 502) {
          lastError = new Error(
            `Open Food Facts is temporarily unavailable (${res.status}). Please try again in a moment.`
          );
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          throw lastError;
        }
        throw new Error(`Open Food Facts search failed: ${res.status}`);
      }

      const data = await res.json();
      let products = Array.isArray(data.products) ? data.products : [];

      if (opts?.realEggsOnly) {
        products = filterRealEggsOnly(products, { checkIngredients: true });
      }

      products = prioritizeByStrictMatch(products, searchTerms.trim());

      return {
        count: data.count ?? 0,
        page: data.page ?? 1,
        page_size: data.page_size ?? 24,
        products,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries && (lastError.name === "AbortError" || lastError.message.includes("504"))) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("Open Food Facts search failed");
}

/**
 * Look up a product by barcode in Open Food Facts.
 * Returns null if not found or on error.
 */
export async function lookupByBarcode(barcode: string): Promise<OffClassificationData | null> {
  try {
    const url = `${OFF_API_BASE}/product/${barcode}.json?fields=${PRODUCT_FIELDS}`;
    const res = await fetch(url, fetchOptions);

    if (!res.ok) return null;

    const json = await res.json();
    const product = json?.product;
    if (!product || json?.status !== 1) return null;

    return extractClassificationData(product);
  } catch {
    return null;
  }
}
