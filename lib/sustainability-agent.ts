/**
 * LLM agent for sustainability assessment of products.
 * Uses Google Gemini. Can call get_product_details(barcode) and search_google(query) for multi-step research.
 */

import {
  GoogleGenAI,
  type Content,
  createPartFromFunctionResponse,
  type FunctionDeclaration,
  type GenerateContentConfig,
  FunctionCallingConfigMode,
  type Schema,
  Type,
} from "@google/genai";
import { lookupByBarcode } from "./openfoodfacts";
import { searchWeb } from "./search-web";

function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is required for sustainability assessment");
  }
  return new GoogleGenAI({ apiKey: key });
}

const MODEL = "gemini-2.5-flash";
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
}

const SYSTEM_PROMPT = `You are a sustainability assessor for consumer products. Use the product data provided (name, brand, categories, labels, ingredients_text, allergens, nutriments, quantity, ecoscore). If you need more detail, call get_product_details with the product barcode.

Use multi-step Google search when useful: call search_google with a query string to look up real-world information.
- Prefer searching "product name" + "environment" or "environmental impact" first.
- Search specific ingredients for environmental toxicity, health concerns, or unethical sourcing when ingredients are available.
- Search brand or category only when you need more context.
- Do not search for every field; use product data and ecoscore when already provided.

Consider: environmental impact, animal welfare (e.g. cage-free vs pasture-raised), harmful or unsustainable ingredients (e.g. palm oil, certain chemicals), packaging, and sourcing. Then respond with a single JSON object only, no other text:

{"verdict":"good"|"moderate"|"poor","score":<0-100>,"reasoning":"<1-2 sentences>","better_alternatives":["<short suggestion>",...]}

Examples: cage-free eggs → good but not perfect (pasture-raised is better); Dove (soap) → often poor due to ingredients; organic vegetables → good.`;

const getProductDetailsDeclaration: FunctionDeclaration = {
  name: "get_product_details",
  description:
    "Fetch full product data (ingredients, labels, additives, ecoscore, nutriscore, etc.) by barcode from Open Food Facts. Call this when you need more detail to assess sustainability (e.g. full ingredients list, specific labels).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      barcode: {
        type: Type.STRING,
        description: "Product barcode (e.g. from product code)",
      },
    },
    required: ["barcode"],
  } as Schema,
};

const searchGoogleDeclaration: FunctionDeclaration = {
  name: "search_google",
  description:
    "Run a Google search and get a summary of results. Use for product environmental impact, ingredient toxicity or unethical sourcing, or brand/category context. Pass a single search query string.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Search query (e.g. 'product name environmental impact', 'palm oil sustainability')",
      },
    },
    required: ["query"],
  } as Schema,
};

const TOOLS_CONFIG: GenerateContentConfig = {
  systemInstruction: SYSTEM_PROMPT,
  tools: [
    {
      functionDeclarations: [getProductDetailsDeclaration, searchGoogleDeclaration],
    },
  ],
  toolConfig: {
    functionCallingConfig: {
      mode: FunctionCallingConfigMode.AUTO,
    },
  },
};

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

  return `Assess this product. Respond with only the JSON object.

Product summary:
- code: ${product.code}
- product_name: ${product.product_name ?? ""}
- brands: ${product.brands ?? ""}
- categories: ${product.categories ?? ""}
- ecoscore_grade: ${product.ecoscore_grade ?? ""}
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
    if (!["good", "moderate", "poor"].includes(verdict)) return null;
    return {
      verdict: verdict as "good" | "moderate" | "poor",
      score: Math.max(0, Math.min(100, Math.round(score))),
      reasoning,
      better_alternatives,
    };
  } catch {
    return null;
  }
}

/**
 * Run the sustainability agent on one product. May call Open Food Facts via get_product_details.
 */
export async function assessProduct(product: ProductSummary): Promise<SustainabilityAssessment> {
  const ai = getGeminiClient();
  const contents: Content[] = [
    { role: "user", parts: [{ text: buildUserMessage(product) }] },
  ];

  let turn = 0;
  let lastText: string | undefined;

  while (turn <= MAX_TOOL_TURNS) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: TOOLS_CONFIG,
    });

    lastText = response.text ?? undefined;

    const functionCalls = response.functionCalls;
    if (!functionCalls?.length) {
      const assessment = parseAssessment(lastText ?? null);
      if (assessment) return assessment;
      throw new Error("Agent did not return valid assessment JSON");
    }

    const candidate = response.candidates?.[0];
    const modelContent = candidate?.content;
    if (modelContent?.parts?.length) {
      contents.push({ role: "model", parts: modelContent.parts });
    }

    const resultParts = [];
    for (const fc of functionCalls) {
      const fcId = fc.id ?? "";
      const fcName = fc.name ?? "";

      if (fcName === "get_product_details") {
        const barcode = typeof fc.args?.barcode === "string" ? fc.args.barcode : product.code;
        const details = await lookupByBarcode(barcode);
        const toolResult = details != null ? JSON.stringify(details) : "Product not found.";
        resultParts.push(
          createPartFromFunctionResponse(fcId, fcName, { result: toolResult })
        );
      } else if (fcName === "search_google") {
        const query = typeof fc.args?.query === "string" ? fc.args.query : "";
        const toolResult = await searchWeb(query);
        resultParts.push(
          createPartFromFunctionResponse(fcId, fcName, { result: toolResult })
        );
      }
    }
    if (resultParts.length) {
      contents.push({ role: "user", parts: resultParts });
    }

    turn++;
  }

  const assessment = parseAssessment(lastText ?? null);
  if (assessment) return assessment;
  throw new Error("Agent exceeded tool turns without valid assessment JSON");
}
