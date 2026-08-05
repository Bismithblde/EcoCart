/**
 * Evidence-aware sustainability assessment agent.
 *
 * The agent can look up Open Food Facts data and search the web, but the final
 * response must satisfy a strict JSON Schema and cite only sources that were
 * actually returned by those tools.
 */

import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { lookupByBarcode } from "./openfoodfacts";
import { searchWeb } from "./search-web";

const MODEL = "gpt-5-mini";
const MAX_TOOL_TURNS = 4;
const MAX_CACHE_ENTRIES = 250;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const ASSESSMENT_VERSION = "2026-08-05.v1";

function getOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is required for sustainability assessment");
  }
  return new OpenAI({ apiKey: key });
}

export interface ProductSummary {
  code: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  nutriscore_grade?: string;
  ecoscore_grade?: string;
  ingredients_text?: string;
  labels_tags?: string[] | string;
  additives_tags?: string[] | string;
  allergens_tags?: string[] | string;
  nutriments?: Record<string, unknown>;
  quantity?: string;
  [key: string]: unknown;
}

export type AssessmentConfidence = "low" | "medium" | "high";

export interface AssessmentSource {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  kind: "product" | "web";
}

export interface SustainabilityAssessment {
  verdict: "good" | "moderate" | "poor";
  score: number;
  reasoning: string;
  better_alternatives: string[];
  tags: string[];
  confidence: AssessmentConfidence;
  sources: AssessmentSource[];
  assessment_version: string;
  assessed_at: string;
}

const AssessmentOutputSchema = z.object({
  verdict: z.enum(["good", "moderate", "poor"]),
  score: z.number(),
  reasoning: z.string(),
  better_alternatives: z.array(z.string()),
  tags: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"]),
  source_ids: z.array(z.string()),
});

const ProductDetailsArgsSchema = z.object({ barcode: z.string() });
const SearchArgsSchema = z.object({ query: z.string() });

const SYSTEM_PROMPT = `You assess the sustainability of consumer products. Environmental impact is the primary concern. Health and nutrition are secondary.

Work from the supplied product data and tool evidence. Call get_product_details when the product record lacks useful detail. Call search_google when ecoscore_grade is missing, when a brand is present and its commitments could materially change the assessment, or when an ingredient needs environmental or ethical context.

Evidence rules:
- Treat an ecoscore as one signal, not a final answer.
- Do not treat broad brand commitments as proof that this specific product performs well.
- Do not invent certifications, sourcing, packaging, ingredients, or animal-welfare claims.
- Missing data is uncertainty, not automatically a negative claim.
- Cite evidence only with source_ids returned in tool results or the supplied product source.
- If evidence is sparse or conflicting, lower confidence and say what remains unknown.

Scoring rules:
- State environmental impact first in reasoning.
- Keep score between 0 and 100.
- Use good for 70-100, moderate for 40-69, and poor for 0-39.
- Keep reasoning concise and specific.
- Return 1-3 short lowercase tags.
- Better alternatives are short category-level suggestions, not invented product claims.

Return the final assessment using the required response schema.`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_product_details",
      description:
        "Fetch a product record from Open Food Facts by barcode when more label, ingredient, nutrition, or ecoscore detail is needed.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          barcode: {
            type: "string",
            description: "The product barcode.",
          },
        },
        required: ["barcode"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_google",
      description:
        "Search for product, brand, ingredient, sourcing, certification, packaging, or environmental evidence. Returns source IDs that may be cited in the final assessment.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "A focused web search query.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
];

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

interface CacheEntry {
  expiresAt: number;
  promise: Promise<SustainabilityAssessment>;
}

const assessmentCache = new Map<string, CacheEntry>();

function asCommaSeparated(value: string[] | string | undefined): string {
  return Array.isArray(value) ? value.join(", ") : value ?? "";
}

function buildProductSource(product: ProductSummary): AssessmentSource | null {
  const code = String(product.code ?? "").trim();
  if (!code) return null;
  return {
    id: "product-1",
    title: `${product.product_name?.trim() || "Product"} - Open Food Facts record`,
    url: `https://world.openfoodfacts.org/product/${encodeURIComponent(code)}`,
    kind: "product",
  };
}

function buildUserMessage(
  product: ProductSummary,
  productSource: AssessmentSource | null
): string {
  const hasEcoscore = Boolean(String(product.ecoscore_grade ?? "").trim());
  const hasBrand = Boolean(String(product.brands ?? "").trim());
  const hasIngredients = Boolean(String(product.ingredients_text ?? "").trim());
  const instructions = [
    !hasEcoscore
      ? "ecoscore_grade is missing. Search for product-level environmental evidence before finishing."
      : "",
    hasBrand
      ? "A brand is present. Search its environmental record only if that context could materially affect this product assessment."
      : "",
    hasIngredients
      ? "Ingredients are present. Address relevant environmental or ethical sourcing concerns without inventing provenance."
      : "",
  ].filter(Boolean);

  return `Assess this product.
${instructions.join("\n")}
Available source IDs: ${productSource?.id ?? "none"}.

Product summary:
- code: ${product.code}
- product_name: ${product.product_name ?? ""}
- brands: ${product.brands ?? ""}
- categories: ${product.categories ?? ""}
- ecoscore_grade: ${product.ecoscore_grade ?? ""}
- nutriscore_grade: ${product.nutriscore_grade ?? ""}
- ingredients_text: ${(product.ingredients_text ?? "").slice(0, 700)}
- labels_tags: ${asCommaSeparated(product.labels_tags)}
- additives_tags: ${asCommaSeparated(product.additives_tags)}
- allergens_tags: ${asCommaSeparated(product.allergens_tags)}
- quantity: ${product.quantity ?? ""}
- nutriments: ${
    product.nutriments && typeof product.nutriments === "object"
      ? JSON.stringify(product.nutriments).slice(0, 500)
      : ""
  }`;
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeSuggestion(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 180);
}

function normalizeProductForCache(product: ProductSummary): Record<string, unknown> {
  return {
    code: product.code,
    product_name: product.product_name ?? "",
    brands: product.brands ?? "",
    categories: product.categories ?? "",
    nutriscore_grade: product.nutriscore_grade ?? "",
    ecoscore_grade: product.ecoscore_grade ?? "",
    ingredients_text: product.ingredients_text ?? "",
    labels_tags: product.labels_tags ?? [],
    additives_tags: product.additives_tags ?? [],
    allergens_tags: product.allergens_tags ?? [],
    nutriments: product.nutriments ?? {},
    quantity: product.quantity ?? "",
  };
}

function getCacheKey(product: ProductSummary): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        model: MODEL,
        version: ASSESSMENT_VERSION,
        product: normalizeProductForCache(product),
      })
    )
    .digest("hex");
}

function pruneCache(now: number): void {
  for (const [key, entry] of assessmentCache) {
    if (entry.expiresAt <= now) assessmentCache.delete(key);
  }
  while (assessmentCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = assessmentCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    assessmentCache.delete(oldestKey);
  }
}

function readParsedToolArguments(value: unknown): unknown {
  if (!value || typeof value !== "object") return {};
  const fn = value as { parsed_arguments?: unknown; arguments?: string };
  if (fn.parsed_arguments != null) return fn.parsed_arguments;
  try {
    return typeof fn.arguments === "string" ? JSON.parse(fn.arguments) : {};
  } catch {
    return {};
  }
}

function finalizeAssessment(
  raw: z.infer<typeof AssessmentOutputSchema>,
  sourceLedger: Map<string, AssessmentSource>,
  product: ProductSummary
): SustainabilityAssessment {
  if (!Number.isFinite(raw.score) || raw.score < 0 || raw.score > 100) {
    throw new Error("Assessment score was outside the supported 0-100 range");
  }

  const score = Math.round(raw.score);
  const expectedVerdict = score >= 70 ? "good" : score >= 40 ? "moderate" : "poor";
  if (raw.verdict !== expectedVerdict) {
    throw new Error("Assessment verdict did not match the score band");
  }

  const sourceIds = [...new Set(raw.source_ids)].filter((id) => sourceLedger.has(id));
  if (sourceIds.length === 0) {
    throw new Error("Assessment did not cite any supplied evidence");
  }

  const sources = sourceIds.map((id) => sourceLedger.get(id)!);
  const hasWebEvidence = sources.some((source) => source.kind === "web");
  const hasProductSignal = Boolean(String(product.ecoscore_grade ?? "").trim());
  const confidence: AssessmentConfidence =
    !hasWebEvidence && !hasProductSignal ? "low" : raw.confidence;

  const tags = [...new Set(raw.tags.map(normalizeTag).filter(Boolean))].slice(0, 3);
  const betterAlternatives = [
    ...new Set(raw.better_alternatives.map(normalizeSuggestion).filter(Boolean)),
  ].slice(0, 4);

  return {
    verdict: raw.verdict,
    score,
    reasoning: raw.reasoning.trim().slice(0, 900),
    better_alternatives: betterAlternatives,
    tags,
    confidence,
    sources,
    assessment_version: ASSESSMENT_VERSION,
    assessed_at: new Date().toISOString(),
  };
}

async function runAssessment(product: ProductSummary): Promise<SustainabilityAssessment> {
  const client = getOpenAIClient();
  const productSource = buildProductSource(product);
  const sourceLedger = new Map<string, AssessmentSource>();
  if (productSource) sourceLedger.set(productSource.id, productSource);

  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserMessage(product, productSource) },
  ];

  let webSourceCounter = 0;

  for (let turn = 0; turn <= MAX_TOOL_TURNS; turn++) {
    const response = await client.chat.completions.parse({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      parallel_tool_calls: false,
      max_completion_tokens: 900,
      response_format: zodResponseFormat(
        AssessmentOutputSchema,
        "sustainability_assessment"
      ),
    });

    const choice = response.choices[0];
    const message = choice?.message;
    if (!message) throw new Error("Agent returned no message");
    if (message.refusal) throw new Error(`Agent refused the assessment: ${message.refusal}`);

    if (!message.tool_calls?.length) {
      if (choice.finish_reason !== "stop") {
        throw new Error(`Agent response ended with ${choice.finish_reason ?? "unknown status"}`);
      }
      const parsed = AssessmentOutputSchema.safeParse(message.parsed);
      if (!parsed.success) {
        throw new Error(`Agent response failed runtime validation: ${parsed.error.message}`);
      }
      return finalizeAssessment(parsed.data, sourceLedger, product);
    }

    messages.push(message as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam);

    for (const toolCall of message.tool_calls) {
      const name = toolCall.function.name;
      const rawArguments = readParsedToolArguments(toolCall.function);

      if (name === "get_product_details") {
        const parsedArgs = ProductDetailsArgsSchema.safeParse(rawArguments);
        const barcode = parsedArgs.success ? parsedArgs.data.barcode : product.code;
        const details = barcode ? await lookupByBarcode(barcode) : null;
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            source_id: productSource?.id ?? null,
            product: details,
            error: details ? null : "Product not found.",
          }),
        });
        continue;
      }

      if (name === "search_google") {
        const parsedArgs = SearchArgsSchema.safeParse(rawArguments);
        const query = parsedArgs.success ? parsedArgs.data.query.trim() : "";
        const search = await searchWeb(query);
        const sources = search.results.map((result) => {
          webSourceCounter += 1;
          const source: AssessmentSource = {
            id: `web-${webSourceCounter}`,
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            kind: "web",
          };
          sourceLedger.set(source.id, source);
          return source;
        });
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            query: search.query,
            error: search.error ?? null,
            sources,
          }),
        });
        continue;
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify({ error: `Unknown tool: ${name}` }),
      });
    }
  }

  throw new Error("Agent exceeded the tool-turn limit");
}

const ASSESSMENT_ERROR_PREFIX = "Sustainability assessment failed: ";

/**
 * Assess one product. Identical requests share an in-flight promise and use a
 * short-lived in-process cache, which is intentionally sufficient for this demo.
 */
export async function assessProduct(product: ProductSummary): Promise<SustainabilityAssessment> {
  const key = getCacheKey(product);
  const now = Date.now();
  const cached = assessmentCache.get(key);
  if (cached && cached.expiresAt > now) return cached.promise;

  pruneCache(now);
  const promise = runAssessment(product).catch((error) => {
    assessmentCache.delete(key);
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      message.startsWith(ASSESSMENT_ERROR_PREFIX)
        ? message
        : `${ASSESSMENT_ERROR_PREFIX}${message}`
    );
  });

  assessmentCache.set(key, { expiresAt: now + CACHE_TTL_MS, promise });
  return promise;
}
