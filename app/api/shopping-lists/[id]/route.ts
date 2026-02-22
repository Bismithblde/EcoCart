import { NextRequest, NextResponse } from "next/server";
import { getSupabaseForUser } from "@/lib/supabase/server";
import { getAccessTokenFromRequest } from "@/lib/api-auth";
import {
  mapListRowToList,
  mapListItemRowsToItems,
  type ShoppingListRow,
  type ShoppingListItemRowWithListId,
} from "@/lib/shopping-list";

/**
 * GET /api/shopping-lists/[id]
 * Get one list with its items. Requires list to belong to the authenticated user (RLS).
 * Requires: Authorization: Bearer <access_token>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseForUser(token);
    const { data: listData, error: listError } = await supabase
      .from("shopping_lists")
      .select("*")
      .eq("id", id)
      .single();

    if (listError) {
      if (listError.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      console.error("[shopping-lists GET id]", listError);
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("shopping_list_items")
      .select("*")
      .eq("list_id", id)
      .order("created_at", { ascending: false });

    if (itemsError) {
      console.error("[shopping-lists GET id items]", itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const list = mapListRowToList(listData as ShoppingListRow);
    const items = mapListItemRowsToItems(
      (itemsData ?? []) as ShoppingListItemRowWithListId[]
    );
    return NextResponse.json({ list, items });
  } catch (err) {
    console.error("[shopping-lists GET id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
