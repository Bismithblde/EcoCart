/**
 * Types and DB schema for the shopping list.
 * Tables: shopping_list (legacy), shopping_lists, shopping_list_items (see BACKEND.md for SQL).
 */

export type SustainabilityVerdict = "good" | "moderate" | "poor";
export type SustainabilityConfidence = "low" | "medium" | "high";

export interface ShoppingListAssessmentSource {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  kind: "product" | "web";
}

export interface ShoppingListSustainability {
  verdict: SustainabilityVerdict;
  score: number;
  reasoning: string;
  better_alternatives: string[];
  tags?: string[];
  confidence?: SustainabilityConfidence;
  sources?: ShoppingListAssessmentSource[];
  assessment_version?: string;
  assessed_at?: string;
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
  sustainability_tags?: string[] | null;
  sustainability_confidence?: SustainabilityConfidence | null;
  sustainability_sources?: ShoppingListAssessmentSource[] | null;
  sustainability_assessment_version?: string | null;
  sustainability_assessed_at?: string | null;
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
  sustainability_tags?: string[] | null;
  sustainability_confidence?: SustainabilityConfidence | null;
  sustainability_sources?: ShoppingListAssessmentSource[] | null;
  sustainability_assessment_version?: string | null;
  sustainability_assessed_at?: string | null;
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
  sustainability_tags?: string[] | null;
  sustainability_confidence?: SustainabilityConfidence | null;
  sustainability_sources?: ShoppingListAssessmentSource[] | null;
  sustainability_assessment_version?: string | null;
  sustainability_assessed_at?: string | null;
}): ShoppingListSustainability | null {
  const tags = Array.isArray(row.sustainability_tags) ? row.sustainability_tags : undefined;
  const sources = Array.isArray(row.sustainability_sources)
    ? row.sustainability_sources
    : undefined;
  return row.sustainability_verdict != null && row.sustainability_score != null
    ? {
        verdict: row.sustainability_verdict,
        score: row.sustainability_score,
        reasoning: row.sustainability_reasoning ?? "",
        better_alternatives: row.sustainability_better_alternatives ?? [],
        ...(tags?.length ? { tags } : {}),
        ...(row.sustainability_confidence
          ? { confidence: row.sustainability_confidence }
          : {}),
        ...(sources?.length ? { sources } : {}),
        ...(row.sustainability_assessment_version
          ? { assessment_version: row.sustainability_assessment_version }
          : {}),
        ...(row.sustainability_assessed_at
          ? { assessed_at: row.sustainability_assessed_at }
          : {}),
      }
    : null;
}

function sanitizeAssessmentSources(value: unknown): ShoppingListAssessmentSource[] | null {
  if (!Array.isArray(value)) return null;
  const sources = value
    .filter((source): source is Record<string, unknown> => Boolean(source) && typeof source === "object")
    .map((source) => ({
      id: typeof source.id === "string" ? source.id.slice(0, 80) : "",
      title: typeof source.title === "string" ? source.title.slice(0, 240) : "",
      url: typeof source.url === "string" ? source.url.slice(0, 1000) : "",
      snippet: typeof source.snippet === "string" ? source.snippet.slice(0, 500) : undefined,
      kind: source.kind === "web" ? "web" as const : "product" as const,
    }))
    .filter((source) => source.id && source.title && /^https?:\/\//i.test(source.url))
    .slice(0, 12);
  return sources.length ? sources : null;
}

/** Convert a client assessment into the database column contract. */
export function sustainabilityToRowFields(value: unknown): Record<string, unknown> {
  const sustainability = value && typeof value === "object"
    ? value as Record<string, unknown>
    : null;
  const verdict = sustainability?.verdict;
  const score = sustainability?.score;
  const confidence = sustainability?.confidence;

  return {
    sustainability_verdict:
      verdict === "good" || verdict === "moderate" || verdict === "poor" ? verdict : null,
    sustainability_score:
      typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100
        ? Math.round(score)
        : null,
    sustainability_reasoning:
      typeof sustainability?.reasoning === "string"
        ? sustainability.reasoning.slice(0, 2000)
        : null,
    sustainability_better_alternatives: Array.isArray(sustainability?.better_alternatives)
      ? sustainability.better_alternatives.filter((item): item is string => typeof item === "string").slice(0, 8)
      : null,
    sustainability_tags: Array.isArray(sustainability?.tags)
      ? sustainability.tags.filter((item): item is string => typeof item === "string").slice(0, 5)
      : null,
    sustainability_confidence:
      confidence === "low" || confidence === "medium" || confidence === "high"
        ? confidence
        : null,
    sustainability_sources: sanitizeAssessmentSources(sustainability?.sources),
    sustainability_assessment_version:
      typeof sustainability?.assessment_version === "string"
        ? sustainability.assessment_version.slice(0, 80)
        : null,
    sustainability_assessed_at:
      typeof sustainability?.assessed_at === "string" && !Number.isNaN(Date.parse(sustainability.assessed_at))
        ? new Date(sustainability.assessed_at).toISOString()
        : null,
  };
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
