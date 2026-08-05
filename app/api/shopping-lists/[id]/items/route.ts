import { NextRequest, NextResponse } from "next/server";
import { getSupabaseForUser } from "@/lib/supabase/server";
import { getAccessTokenFromRequest } from "@/lib/api-auth";
import {
  mapListItemRowToItem,
  sustainabilityToRowFields,
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
    const sustainabilityFields = sustainabilityToRowFields(body?.sustainability);

    const supabase = getSupabaseForUser(token);
    const { data, error } = await supabase
      .from("shopping_list_items")
      .insert({
        list_id: listId,
        code,
        product_name: productName,
        brands,
        ...sustainabilityFields,
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
