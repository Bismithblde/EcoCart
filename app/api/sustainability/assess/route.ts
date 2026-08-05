import { NextRequest, NextResponse } from "next/server";
import {
  AssessmentDeadlineError,
  assessProduct,
  type ProductSummary,
} from "@/lib/sustainability-agent";
import { authorizeAiRequest } from "@/lib/ai-request-guard";
import type { AssessmentStreamEvent } from "@/lib/sustainability-types";

const MAX_PRODUCTS = 3;

function checkOpenAIKey(): void {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is required for sustainability assessment");
  }
}

/**
 * POST /api/sustainability/assess
 *
 * Assess sustainability of each product using an LLM agent. The agent may call
 * Open Food Facts (get_product_details) for more data. Requires OPENAI_API_KEY.
 *
 * Body: { products: Array<{ code, product_name?, brands?, ... }> }
 * Streams NDJSON progress events and ends with a complete event containing
 * products and their sustainability assessments.
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeAiRequest(request);
    if ("response" in authorization) return authorization.response;

    checkOpenAIKey();
    const body = await request.json();
    const raw = body?.products;

    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty products array" },
        { status: 400 }
      );
    }

    if (raw.length > MAX_PRODUCTS) {
      return NextResponse.json(
        { error: `A maximum of ${MAX_PRODUCTS} products can be assessed at once` },
        { status: 400 }
      );
    }

    const products: ProductSummary[] = raw.map((p: unknown) => {
      const o = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
      return {
        code: String(o.code ?? ""),
        product_name: typeof o.product_name === "string" ? o.product_name : undefined,
        brands: typeof o.brands === "string" ? o.brands : undefined,
        categories: typeof o.categories === "string" ? o.categories : undefined,
        nutriscore_grade: typeof o.nutriscore_grade === "string" ? o.nutriscore_grade : undefined,
        ecoscore_grade: typeof o.ecoscore_grade === "string" ? o.ecoscore_grade : undefined,
        ecoscore_score:
          typeof o.ecoscore_score === "number" && Number.isFinite(o.ecoscore_score)
            ? o.ecoscore_score
            : undefined,
        ingredients_text:
          typeof o.ingredients_text === "string"
            ? o.ingredients_text
            : typeof o.ingredients === "string"
              ? o.ingredients
              : undefined,
        labels_tags:
          typeof o.labels_tags === "string" || Array.isArray(o.labels_tags)
            ? o.labels_tags as string | string[]
            : undefined,
        additives_tags:
          typeof o.additives_tags === "string" || Array.isArray(o.additives_tags)
            ? o.additives_tags as string | string[]
            : undefined,
        allergens_tags:
          typeof o.allergens_tags === "string" || Array.isArray(o.allergens_tags)
            ? o.allergens_tags as string | string[]
            : undefined,
        nutriments:
          o.nutriments && typeof o.nutriments === "object"
            ? o.nutriments as Record<string, unknown>
            : undefined,
        quantity: typeof o.quantity === "string" ? o.quantity : undefined,
      } as ProductSummary;
    });

    if (products.some((product) => !product.code.trim())) {
      return NextResponse.json(
        { error: "Every product must include a code" },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    const workflowController = new AbortController();
    let closed = false;
    const abortFromRequest = () => workflowController.abort(request.signal.reason);
    if (request.signal.aborted) abortFromRequest();
    else request.signal.addEventListener("abort", abortFromRequest, { once: true });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: AssessmentStreamEvent) => {
          if (closed || workflowController.signal.aborted) return;
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        void (async () => {
          try {
            const results = await Promise.all(
              products.map(async (product) => {
                try {
                  const assessment = await assessProduct(product, {
                    signal: workflowController.signal,
                    onProgress: send,
                  });
                  return { ...product, sustainability_assessment: assessment };
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : "Assessment failed";
                  return {
                    ...product,
                    sustainability_assessment: { error: message },
                  };
                }
              }),
            );
            send({ type: "complete", products: results });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Assessment stream failed";
            send({
              type: "error",
              error: message,
              code:
                error instanceof AssessmentDeadlineError
                  ? "deadline_exceeded"
                  : "stream_failed",
            });
          } finally {
            request.signal.removeEventListener("abort", abortFromRequest);
            if (!closed) {
              closed = true;
              try {
                controller.close();
              } catch {
                // The browser may have already cancelled the stream.
              }
            }
          }
        })();
      },
      cancel(reason) {
        closed = true;
        workflowController.abort(reason);
        request.signal.removeEventListener("abort", abortFromRequest);
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Content-Type-Options": "nosniff",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message.includes("OPENAI_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
