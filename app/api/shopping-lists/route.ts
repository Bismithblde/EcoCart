import { NextRequest, NextResponse } from "next/server";
import { getSupabaseForUser } from "@/lib/supabase/server";
import { getAccessTokenFromRequest, getUserIdFromToken } from "@/lib/api-auth";
import {
  mapListRowToList,
  mapListRowsToLists,
  type ShoppingListRow,
} from "@/lib/shopping-list";

/**
 * GET /api/shopping-lists
 * List the authenticated user's shopping lists (newest first).
 * Requires: Authorization: Bearer <access_token>
 */
export async function GET(request: NextRequest) {
  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseForUser(token);
    const { data, error } = await supabase
      .from("shopping_lists")
      .select("id, user_id, name, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[shopping-lists GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const lists = mapListRowsToLists((data ?? []) as ShoppingListRow[]);
    return NextResponse.json({ lists });
  } catch (err) {
    console.error("[shopping-lists GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/shopping-lists
 * Create a new shopping list.
 * Body: { name: string }
 * Requires: Authorization: Bearer <access_token>
 */
export async function POST(request: NextRequest) {
  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  try {
    const userId = await getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name =
      body?.name != null ? String(body.name).trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseForUser(token);
    const { data, error } = await supabase
      .from("shopping_lists")
      .insert({ user_id: userId, name })
      .select()
      .single();

    if (error) {
      console.error("[shopping-lists POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = mapListRowToList(data as ShoppingListRow);
    return NextResponse.json({ list });
  } catch (err) {
    console.error("[shopping-lists POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
