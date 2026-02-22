import { NextRequest, NextResponse } from "next/server";
import { getSupabaseForUser } from "@/lib/supabase/server";
import { mapRowToItem, type ShoppingListItemRow } from "@/lib/shopping-list";

function getAccessToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !/^Bearer\s+/i.test(auth)) return null;
  return auth.replace(/^Bearer\s+/i, "").trim();
}

/**
 * GET /api/shopping-list/:id
 * Get a single shopping list item by id.
 * Requires: Authorization: Bearer <access_token>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAccessToken(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseForUser(token);
    const { data, error } = await supabase
      .from("shopping_list")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      console.error("[shopping-list GET id]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const item = mapRowToItem(data as ShoppingListItemRow);
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[shopping-list GET id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/shopping-list/:id
 * Update an item (product fields and/or sustainability).
 * Body: { code?, productName?, brands?, sustainability? } (all optional)
 * Requires: Authorization: Bearer <access_token>
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAccessToken(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body?.code !== undefined) updates.code = String(body.code).trim();
    if (body?.productName !== undefined) updates.product_name = body.productName;
    if (body?.brands !== undefined) updates.brands = body.brands;

    const sustainability = body?.sustainability;
    if (sustainability !== undefined) {
      updates.sustainability_verdict =
        sustainability?.verdict && ["good", "moderate", "poor"].includes(sustainability.verdict)
          ? sustainability.verdict
          : null;
      updates.sustainability_score =
        typeof sustainability?.score === "number" ? sustainability.score : null;
      updates.sustainability_reasoning =
        typeof sustainability?.reasoning === "string" ? sustainability.reasoning : null;
      updates.sustainability_better_alternatives = Array.isArray(sustainability?.better_alternatives)
        ? sustainability.better_alternatives
        : null;
    }

    const supabase = getSupabaseForUser(token);
    const { data, error } = await supabase
      .from("shopping_list")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      console.error("[shopping-list PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const item = mapRowToItem(data as ShoppingListItemRow);
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[shopping-list PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/shopping-list/:id
 * Remove an item from the shopping list.
 * Requires: Authorization: Bearer <access_token>
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAccessToken(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseForUser(token);
    const { error } = await supabase.from("shopping_list").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      console.error("[shopping-list DELETE]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[shopping-list DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
