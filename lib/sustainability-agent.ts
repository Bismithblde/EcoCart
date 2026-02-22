/**
 * LLM agent for sustainability assessment of products.
 * Uses OpenAI (gpt-5-mini). Can call get_product_details(barcode) and search_google(query) for multi-step research.
 */

import OpenAI from "openai";
import { lookupByBarcode } from "./openfoodfacts";
import { searchWeb } from "./search-web";

function getOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is required for sustainability assessment");
  }
  return new OpenAI({ apiKey: key });
}

const MODEL = "gpt-5-mini";
const MAX_TOOL_TURNS = 5;

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

export interface SustainabilityAssessment {
  verdict: "good" | "moderate" | "poor";
  score: number;
  reasoning: string;
  better_alternatives: string[];
  /** Short summary tags from the AI (e.g. no pledge, bad ingredients, unhealthy). */
  tags: string[];
}

const SYSTEM_PROMPT = `You are a sustainability assessor for consumer products. Environmental impact is the top priority; health/nutrition is secondary.

Use the product data provided (name, brand, categories, labels, ingredients_text, allergens, nutriments, quantity, ecoscore). If you need more detail, call get_product_details with the product barcode.

When ingredients_text (or ingredients) is present and non-empty: you MUST assess whether those ingredients are good for the environment and ethically sourced. Consider deforestation-linked ingredients (e.g. palm oil, soy from high-risk regions), animal welfare (animal-derived ingredients), pesticides, and labor/sourcing ethics where relevant. Include this ingredients assessment in your reasoning (e.g. "Ingredients include… which raises concerns about…" or "Ingredients appear to be… with no major environmental or ethical red flags"). If you are unsure about specific ingredients, use search_google (e.g. "ingredient name sustainability ethical").

Treat ecoscore_grade as one input among others, not as definitive. If search results, brand commitments, or other evidence contradicts or qualifies the ecoscore (e.g. brand is improving practices, product has certifications the score doesn’t reflect), weigh that evidence and adjust your assessment; do not take the ecoscore literally when it conflicts with what you find.

When ecoscore_grade is missing or empty you MUST call search_google first—do not skip this. Use a query like "[product_name] [brand] environmental impact" and use the search results in your reasoning. Never tell the user to "consider searching"; you must actually call the search_google tool before returning your final JSON.

When a brand or company name is present in the product data: also call search_google with a query like "[that brand name] sustainability environmental commitments" or "[that brand name] environmental goals". Use the results to acknowledge if the company is taking steps to reduce impact (e.g. cage-free commitments, carbon goals); do not assess the product in isolation when company-level efforts are relevant.

Use search_google for: (1) environmental impact when ecoscore is missing, (2) company/brand sustainability efforts when a brand is present, (3) specific ingredients' environmental or health concerns when needed, (4) brand/category context only when needed. Do not search for every field; use product data when already provided.

Do not assume missing data means negative. If the product does not state egg type (cage-free, free-range, organic, etc.), animal-welfare certifications, or sourcing details, do not state that it "lacks" or "has no" those attributes—the data may simply be incomplete. Say instead that the product "does not specify" or "does not list" that information on the label, or search for more detail; never assume conventional/caged production or lack of certifications when the product record is silent.

Consider (in this order of priority): (1) environmental impact—use ecoscore as a signal but combine with search results and brand context; if evidence contradicts the ecoscore, say so and reflect it in verdict/score, (2) when ingredients are provided—assess them for environmental and ethical sourcing (palm oil, animal welfare, pesticides, labor) and state this in reasoning, (3) animal welfare (only as stated or found—do not assume), (4) harmful or unsustainable ingredients, (5) packaging and sourcing, (6) nutrition only if relevant.

In your "reasoning" field always state environmental impact first. When ecoscore is present, you may cite it but if you have contradictory or mitigating evidence (e.g. brand commitments, certifications), note that and do not treat the ecoscore as final (e.g. "Ecoscore D, though the brand has committed to…" or "Search results suggest better practices than the ecoscore implies"). If you found company sustainability efforts, mention them. If you searched and found nothing useful, say "Environmental impact could not be determined from search." When ingredients were provided, include your assessment of whether they are environmentally sound and ethically sourced. Then add health/nutrition in a final phrase if relevant.

Also output a "tags" array: 1–3 short, lowercase summary tags that capture the main conclusions (e.g. "no pledge", "bad ingredients", "unhealthy", "palm oil", "brand committed", "organic"). You decide which tags fit; pick the 1–3 most relevant. Use concise slug-like phrases (lowercase, no spaces or use hyphens).

Respond with a single JSON object only, no other text:

{"verdict":"good"|"moderate"|"poor","score":<0-100>,"reasoning":"<1-2 sentences: environmental impact first, then other factors>","better_alternatives":["<short suggestion>",...],"tags":["<tag1>","<tag2>",...]}

Examples: cage-free eggs → good but not perfect (pasture-raised is better); Dove (soap) → often poor due to ingredients; organic vegetables → good.`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_product_details",
      description:
        "Fetch full product data (ingredients, labels, additives, ecoscore, nutriscore, etc.) by barcode from Open Food Facts. Call this when you need more detail to assess sustainability (e.g. full ingredients list, specific labels).",
      parameters: {
        type: "object",
        properties: {
          barcode: {
            type: "string",
            description: "Product barcode (e.g. from product code)",
          },
        },
        required: ["barcode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_google",
      description:
        "Run a Google search and get a summary of results. REQUIRED when ecoscore_grade is missing: call with a query like 'product name brand environmental impact'. When a brand is present, also search for that brand's sustainability (e.g. '<brand name> sustainability environmental'). Use for ingredient toxicity, unethical sourcing, or brand context. Pass a single search query string.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query (e.g. 'product name environmental impact', '<brand> sustainability environmental', 'palm oil sustainability')",
          },
        },
        required: ["query"],
      },
    },
  },
];

function buildUserMessage(product: ProductSummary): string {
  const labels = Array.isArray(product.labels_tags)
    ? product.labels_tags.join(", ")
    : typeof product.labels_tags === "string"
      ? product.labels_tags
      : "";
  const additives = Array.isArray(product.additives_tags)
    ? product.additives_tags.join(", ")
    : typeof product.additives_tags === "string"
      ? product.additives_tags
      : "";
  const allergens = Array.isArray(product.allergens_tags)
    ? product.allergens_tags.join(", ")
    : typeof product.allergens_tags === "string"
      ? product.allergens_tags
      : "";

  const nutrimentsStr =
    product.nutriments && typeof product.nutriments === "object"
      ? JSON.stringify(product.nutriments).slice(0, 300)
      : "";
  const quantityStr = product.quantity ?? "";

  const hasEcoscore = product.ecoscore_grade != null && String(product.ecoscore_grade).trim() !== "";
  const hasBrand = product.brands != null && String(product.brands).trim() !== "";
  const hasIngredients =
    product.ingredients_text != null && String(product.ingredients_text).trim() !== "";
  return `Assess this product. Environmental impact is the main priority; state it first in your reasoning.
${!hasEcoscore ? "ecoscore_grade is MISSING. You MUST call search_google with a query like '" + (product.product_name ?? "") + " " + (product.brands ?? "") + " environmental impact' (or similar) BEFORE returning your JSON. Use the search results in your reasoning. Do not return JSON that says 'consider searching'—you must search first." : ""}
${hasBrand ? "A brand is given. Also call search_google for that brand's sustainability (e.g. brand name + ' sustainability environmental') and mention any relevant commitments in your reasoning." : ""}
${hasIngredients ? "Ingredients are provided below; determine whether they are good for the environment and ethically sourced and include that assessment in your reasoning." : ""}
Do not assume missing labels (e.g. cage-free, organic) mean the product lacks them—say 'does not specify' if the data is silent.
Respond with only the JSON object when done.

Product summary:
- code: ${product.code}
- product_name: ${product.product_name ?? ""}
- brands: ${product.brands ?? ""}
- categories: ${product.categories ?? ""}
- ecoscore_grade: ${product.ecoscore_grade ?? ""} (use as a signal; if search or brand info contradicts it, weigh that and adjust)
- nutriscore_grade: ${product.nutriscore_grade ?? ""}
- ingredients_text: ${(product.ingredients_text ?? "").slice(0, 500)}
- labels_tags: ${labels}
- additives_tags: ${additives}
- allergens_tags: ${allergens}
- quantity: ${quantityStr}
- nutriments: ${nutrimentsStr}`;
}

function parseAssessment(content: string | null): SustainabilityAssessment | null {
  if (!content || typeof content !== "string") return null;
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const verdict = parsed.verdict as string;
    const score = typeof parsed.score === "number" ? parsed.score : Number(parsed.score);
    const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "";
    const better_alternatives = Array.isArray(parsed.better_alternatives)
      ? (parsed.better_alternatives as string[])
      : [];
    const rawTags = Array.isArray(parsed.tags) ? (parsed.tags as unknown[]) : [];
    const tags = rawTags
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
      .slice(0, 3);
    if (!["good", "moderate", "poor"].includes(verdict)) return null;
    return {
      verdict: verdict as "good" | "moderate" | "poor",
      score: Math.max(0, Math.min(100, Math.round(score))),
      reasoning,
      better_alternatives,
      tags,
    };
  } catch {
    return null;
  }
}

const ASSESSMENT_ERROR_PREFIX = "Sustainability assessment failed: ";

type Message =
  | OpenAI.Chat.Completions.ChatCompletionMessageParam
  | OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;

/**
 * Run the sustainability agent on one product. May call Open Food Facts via get_product_details.
 */
export async function assessProduct(product: ProductSummary): Promise<SustainabilityAssessment> {
  try {
    const client = getOpenAIClient();
    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(product) },
    ];

    let turn = 0;
    let lastContent: string | null = null;

    while (turn <= MAX_TOOL_TURNS) {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      });

      const choice = response.choices?.[0];
      const msg = choice?.message;
      lastContent = msg?.content ?? null;

      const toolCalls = msg?.tool_calls;
      if (!toolCalls?.length) {
        const assessment = parseAssessment(lastContent);
        if (assessment) return assessment;
        throw new Error("Agent did not return valid assessment JSON");
      }

      messages.push(msg as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam);

      const toolResults: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] = [];
      for (const tc of toolCalls) {
        const id = tc.id;
        const name = tc.function?.name ?? "";
        const args = (() => {
          try {
            return typeof tc.function?.arguments === "string"
              ? (JSON.parse(tc.function.arguments) as Record<string, unknown>)
              : {};
          } catch {
            return {};
          }
        })();

        if (name === "get_product_details") {
          const barcode = typeof args.barcode === "string" ? args.barcode : product.code;
          const details = await lookupByBarcode(barcode);
          const result = details != null ? JSON.stringify(details) : "Product not found.";
          toolResults.push({ role: "tool", tool_call_id: id, content: result });
        } else if (name === "search_google") {
          const query = typeof args.query === "string" ? args.query : "";
          const result = await searchWeb(query);
          toolResults.push({ role: "tool", tool_call_id: id, content: result });
        }
      }

      for (const tr of toolResults) {
        messages.push(tr);
      }

      turn++;
    }

    const assessment = parseAssessment(lastContent);
    if (assessment) return assessment;
    throw new Error("Agent exceeded tool turns without valid assessment JSON");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw new Error(
      message.startsWith(ASSESSMENT_ERROR_PREFIX) ? message : ASSESSMENT_ERROR_PREFIX + message
    );
  }
}
