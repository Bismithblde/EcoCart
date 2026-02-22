import { NextRequest, NextResponse } from "next/server";
import { getSupabaseForUser } from "@/lib/supabase/server";
import { getAccessTokenFromRequest } from "@/lib/api-auth";
import {
  mapListItemRowToItem,
  type ShoppingListItemRowWithListId,
} from "@/lib/shopping-list";

/**
 * POST /api/shopping-lists/[id]/items
 * Add an item to the list. Body: { code (required), productName?, brands?, sustainability? }
 * Requires: Authorization: Bearer <access_token>
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  const { id: listId } = await params;
  if (!listId) {
    return NextResponse.json({ error: "list id is required" }, { status: 400 });
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

    const productName =
      body?.productName != null ? String(body.productName) : null;
    const brands = body?.brands != null ? String(body.brands) : null;
    const sustainability = body?.sustainability;
    const sustainability_verdict =
      sustainability?.verdict &&
      ["good", "moderate", "poor"].includes(sustainability.verdict)
        ? sustainability.verdict
        : null;
    const sustainability_score =
      typeof sustainability?.score === "number" ? sustainability.score : null;
    const sustainability_reasoning =
      typeof sustainability?.reasoning === "string"
        ? sustainability.reasoning
        : null;
    const sustainability_better_alternatives = Array.isArray(
      sustainability?.better_alternatives
    )
      ? sustainability.better_alternatives
      : null;

    const supabase = getSupabaseForUser(token);
    const { data, error } = await supabase
      .from("shopping_list_items")
      .insert({
        list_id: listId,
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
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "List not found or access denied" },
          { status: 404 }
        );
      }
      console.error("[shopping-lists POST item]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const item = mapListItemRowToItem(data as ShoppingListItemRowWithListId);
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[shopping-lists POST item]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
