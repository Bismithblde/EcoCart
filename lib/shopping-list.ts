/**
 * Types and DB schema for the shopping list.
 * Tables: shopping_list (legacy), shopping_lists, shopping_list_items (see BACKEND.md for SQL).
 */

export type SustainabilityVerdict = "good" | "moderate" | "poor";

export interface ShoppingListSustainability {
  verdict: SustainabilityVerdict;
  score: number;
  reasoning: string;
  better_alternatives: string[];
  tags?: string[];
}

/** Row from shopping_list (legacy single list per user). */
export interface ShoppingListItemRow {
  id: string;
  user_id: string;
  code: string;
  product_name: string | null;
  brands: string | null;
  sustainability_verdict: SustainabilityVerdict | null;
  sustainability_score: number | null;
  sustainability_reasoning: string | null;
  sustainability_better_alternatives: string[] | null;
  created_at: string;
  updated_at: string;
}

/** Row from shopping_list_items (list-scoped items). */
export interface ShoppingListItemRowWithListId {
  id: string;
  list_id: string;
  code: string;
  product_name: string | null;
  brands: string | null;
  sustainability_verdict: SustainabilityVerdict | null;
  sustainability_score: number | null;
  sustainability_reasoning: string | null;
  sustainability_better_alternatives: string[] | null;
  created_at: string;
  updated_at: string;
}

/** Row from shopping_lists. */
export interface ShoppingListRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItem {
  id: string;
  userId?: string;
  listId?: string;
  code: string;
  productName: string | null;
  brands: string | null;
  sustainability: ShoppingListSustainability | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
}

function sustainabilityFromRow(row: {
  sustainability_verdict: SustainabilityVerdict | null;
  sustainability_score: number | null;
  sustainability_reasoning: string | null;
  sustainability_better_alternatives: string[] | null;
}): ShoppingListSustainability | null {
  const rowWithTags = row as typeof row & { sustainability_tags?: string[] | null };
  const tags = Array.isArray(rowWithTags.sustainability_tags) ? rowWithTags.sustainability_tags : undefined;
  return row.sustainability_verdict != null && row.sustainability_score != null
    ? {
        verdict: row.sustainability_verdict,
        score: row.sustainability_score,
        reasoning: row.sustainability_reasoning ?? "",
        better_alternatives: row.sustainability_better_alternatives ?? [],
        ...(tags?.length ? { tags } : {}),
      }
    : null;
}

function rowToItem(row: ShoppingListItemRow): ShoppingListItem {
  return {
    id: row.id,
    userId: row.user_id,
    code: row.code,
    productName: row.product_name,
    brands: row.brands,
    sustainability: sustainabilityFromRow(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Map shopping_list_items row to API item (includes listId). */
export function mapListItemRowToItem(
  row: ShoppingListItemRowWithListId
): ShoppingListItem {
  return {
    id: row.id,
    listId: row.list_id,
    code: row.code,
    productName: row.product_name,
    brands: row.brands,
    sustainability: sustainabilityFromRow(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapListItemRowsToItems(
  rows: ShoppingListItemRowWithListId[]
): ShoppingListItem[] {
  return rows.map(mapListItemRowToItem);
}

export function mapRowToItem(row: ShoppingListItemRow): ShoppingListItem {
  return rowToItem(row);
}

export function mapRowsToItems(rows: ShoppingListItemRow[]): ShoppingListItem[] {
  return rows.map(rowToItem);
}

/** Map shopping_lists row to API list. */
export function mapListRowToList(
  row: ShoppingListRow,
  itemCount?: number
): ShoppingList {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(itemCount !== undefined && { itemCount }),
  };
}

export function mapListRowsToLists(
  rows: (ShoppingListRow & { item_count?: number })[],
  includeItemCount = false
): ShoppingList[] {
  return rows.map((row) =>
    mapListRowToList(row, includeItemCount ? row.item_count : undefined)
  );
}
