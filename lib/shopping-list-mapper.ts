/**
 * Map search result (snake_case) to add-item request body (camelCase).
 * Used when adding a product from search to a shopping list.
 */

import type { ShoppingListSustainability } from "@/lib/shopping-list";

/** Minimal shape from search API / useSearch (snake_case). */
export interface SearchProductShape {
  code: string;
  product_name?: string;
  brands?: string;
}

export interface AddItemBody {
  code: string;
  productName?: string;
  brands?: string;
  sustainability?: ShoppingListSustainability;
}

/**
 * Convert a search result to the body shape expected by POST /api/shopping-lists/[id]/items.
 */
export function searchResultToAddItemBody(
  searchResult: SearchProductShape,
  sustainability?: ShoppingListSustainability
): AddItemBody {
  const body: AddItemBody = {
    code: searchResult.code,
    productName: searchResult.product_name ?? undefined,
    brands: searchResult.brands ?? undefined,
  };
  if (sustainability) {
    body.sustainability = sustainability;
  }
  return body;
}
