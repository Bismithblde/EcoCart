import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getSupabaseForUser } from "@/lib/supabase/server";
import { mapRowToItem, mapRowsToItems, type ShoppingListItemRow } from "@/lib/shopping-list";

function getAccessToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !/^Bearer\s+/i.test(auth)) return null;
  return auth.replace(/^Bearer\s+/i, "").trim();
}

async function getUserIdFromToken(token: string): Promise<string | null> {
  const { data: { user } } = await getSupabase().auth.getUser(token);
  return user?.id ?? null;
}

/**
 * GET /api/shopping-list
 * List the authenticated user's shopping list items.
 * Requires: Authorization: Bearer <access_token>
 */
export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseForUser(token);
    const { data, error } = await supabase
      .from("shopping_list")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[shopping-list GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = mapRowsToItems((data ?? []) as ShoppingListItemRow[]);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[shopping-list GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/shopping-list
 * Add an item to the shopping list. Optionally include sustainability data.
 * Body: { code, productName?, brands?, sustainability? }
 * Requires: Authorization: Bearer <access_token>
 */
export async function POST(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const code = body?.code != null ? String(body.code).trim() : "";
    if (!code) {
      return NextResponse.json(
        { error: "code is required" },
        { status: 400 }
      );
    }

    const productName = body?.productName != null ? String(body.productName) : null;
    const brands = body?.brands != null ? String(body.brands) : null;
    const sustainability = body?.sustainability;
    const sustainability_verdict =
      sustainability?.verdict && ["good", "moderate", "poor"].includes(sustainability.verdict)
        ? sustainability.verdict
        : null;
    const sustainability_score =
      typeof sustainability?.score === "number" ? sustainability.score : null;
    const sustainability_reasoning =
      typeof sustainability?.reasoning === "string" ? sustainability.reasoning : null;
    const sustainability_better_alternatives = Array.isArray(sustainability?.better_alternatives)
      ? sustainability.better_alternatives
      : null;

    const userId = await getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const supabase = getSupabaseForUser(token);
    const { data, error } = await supabase
      .from("shopping_list")
      .insert({
        user_id: userId,
        code,
        product_name: productName,
        brands,
        sustainability_verdict,
        sustainability_score,
        sustainability_reasoning,
        sustainability_better_alternatives,
      })
      .select()
      .single();

    if (error) {
      console.error("[shopping-list POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const item = mapRowToItem(data as ShoppingListItemRow);
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[shopping-list POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
