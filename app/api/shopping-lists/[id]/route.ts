import { NextRequest, NextResponse } from "next/server";
import { getSupabaseForUser, getSupabaseServiceRole } from "@/lib/supabase/server";
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

    // Load items with service role when available so RLS on shopping_list_items
    // does not hide rows (ownership already verified by loading the list above).
    const itemsClient = getSupabaseServiceRole() ?? supabase;
    const { data: itemsData, error: itemsError } = await itemsClient
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

async function getParamsAndSupabase(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return { error: NextResponse.json({ error: "Authorization required" }, { status: 401 }) };
  }
  const { id } = await params;
  if (!id) {
    return { error: NextResponse.json({ error: "id is required" }, { status: 400 }) };
  }
  const supabase = getSupabaseForUser(token);
  return { id, supabase };
}

/**
 * PATCH /api/shopping-lists/[id]
 * Update list (e.g. rename). Body: { name: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getParamsAndSupabase(request, params);
  if ("error" in result) return result.error;
  const { id, supabase } = result;

  try {
    const body = await request.json();
    const name = body?.name != null ? String(body.name).trim() : undefined;
    if (name === undefined || name === "") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("shopping_lists")
      .update({ name })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      console.error("[shopping-lists PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = mapListRowToList(data as ShoppingListRow);
    return NextResponse.json({ list });
  } catch (err) {
    console.error("[shopping-lists PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/shopping-lists/[id]
 * Delete the list and all its items.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getParamsAndSupabase(request, params);
  if ("error" in result) return result.error;
  const { id, supabase } = result;

  try {
    const { error: itemsError } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("list_id", id);

    if (itemsError) {
      console.error("[shopping-lists DELETE items]", itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const { error: listError } = await supabase
      .from("shopping_lists")
      .delete()
      .eq("id", id);

    if (listError) {
      console.error("[shopping-lists DELETE]", listError);
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[shopping-lists DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
