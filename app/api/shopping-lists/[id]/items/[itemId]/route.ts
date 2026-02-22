import { NextRequest, NextResponse } from "next/server";
import { getSupabaseForUser } from "@/lib/supabase/server";
import { getAccessTokenFromRequest } from "@/lib/api-auth";
import {
  mapListItemRowToItem,
  type ShoppingListItemRowWithListId,
} from "@/lib/shopping-list";

/**
 * PATCH /api/shopping-lists/[id]/items/[itemId]
 * Update an item. Body: { code?, productName?, brands?, sustainability? } (all optional)
 * Requires: Authorization: Bearer <access_token>
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  const { id: listId, itemId } = await params;
  if (!listId || !itemId) {
    return NextResponse.json(
      { error: "list id and item id are required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body?.code !== undefined) updates.code = String(body.code).trim();
    if (body?.productName !== undefined) updates.product_name = body.productName;
    if (body?.brands !== undefined) updates.brands = body.brands;

    const sustainability = body?.sustainability;
    if (sustainability !== undefined) {
      updates.sustainability_verdict =
        sustainability?.verdict &&
        ["good", "moderate", "poor"].includes(sustainability.verdict)
          ? sustainability.verdict
          : null;
      updates.sustainability_score =
        typeof sustainability?.score === "number" ? sustainability.score : null;
      updates.sustainability_reasoning =
        typeof sustainability?.reasoning === "string"
          ? sustainability.reasoning
          : null;
      updates.sustainability_better_alternatives = Array.isArray(
        sustainability?.better_alternatives
      )
        ? sustainability.better_alternatives
        : null;
      updates.sustainability_tags = Array.isArray(sustainability?.tags)
        ? sustainability.tags
        : null;
    }

    const supabase = getSupabaseForUser(token);
    const { data, error } = await supabase
      .from("shopping_list_items")
      .update(updates)
      .eq("id", itemId)
      .eq("list_id", listId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      console.error("[shopping-lists PATCH item]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const item = mapListItemRowToItem(data as ShoppingListItemRowWithListId);
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[shopping-lists PATCH item]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/shopping-lists/[id]/items/[itemId]
 * Remove an item from the list.
 * Requires: Authorization: Bearer <access_token>
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  const { id: listId, itemId } = await params;
  if (!listId || !itemId) {
    return NextResponse.json(
      { error: "list id and item id are required" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseForUser(token);
    const { error } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("id", itemId)
      .eq("list_id", listId);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      console.error("[shopping-lists DELETE item]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[shopping-lists DELETE item]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
