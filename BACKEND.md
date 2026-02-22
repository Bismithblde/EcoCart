# Backend API Documentation

This document describes all backend API endpoints for the HopperHacks project.

**Base URL:** `http://localhost:3000` (development)

---

## Authentication (Supabase)

Authentication uses Supabase and returns JWTs for authorized requests.

### Setup

Add these to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-api-key
SERPER_API_KEY=your-serper-api-key
```

- Supabase: get values from [Supabase Dashboard](https://supabase.com/dashboard) → your project → Settings → API.
- **OPENAI_API_KEY** is required for product search (embeddings) and sustainability assessment (`POST /api/sustainability/assess`, better alternatives); get an API key from [OpenAI](https://platform.openai.com/api-keys). The app uses gpt-5-mini for the sustainability agent.
- **SERPER_API_KEY** is optional but recommended for sustainability assessment; the LLM uses it for multi-step web search (product+environment, ingredients). Get a key at [serper.dev](https://serper.dev). If unset, web search is disabled and the agent still works with Open Food Facts only.

---

### POST `/api/auth/login`

Log in with email and password. Returns a JWT.

**Request body (JSON):**

| Field    | Type   | Required |
| -------- | ------ | -------- |
| email    | string | Yes      |
| password | string | Yes      |

**Success (200):**

```json
{
  "access_token": "eyJ...",
  "refresh_token": "...",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Errors:** 400 (missing fields), 401 (invalid credentials)

---

### POST `/api/auth/signup`

Create a new account.

**Request body (JSON):**

| Field    | Type   | Required |
| -------- | ------ | -------- |
| email    | string | Yes      |
| password | string | Yes      |

**Success (200) – when email confirmation is disabled:**

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "user": { "id": "...", "email": "user@example.com" }
}
```

**Success (200) – when email confirmation is required:**

```json
{
  "user": { "id": "...", "email": "user@example.com" },
  "message": "Account created. Please check your email to confirm your account before signing in."
}
```

**Errors:** 400 (missing fields or signup failed)

---

## Product Search (Semantic / Vector)

Search uses **semantic search**: the query is embedded with [Featherless](https://featherless.ai) (model `IEITYuan/Yuan-embedding-2.0-en`), [Pinecone](https://www.pinecone.io/) returns the top similar product IDs, and full product data is loaded from the master table (`api_items` or `products`) in Supabase.

**Required env:** `FEATHERLESS_API_KEY`, `PINECONE_API_KEY`. Optional: `PINECONE_INDEX_NAME` (default: `hopperhacks`), `MASTER_TABLE` (default: `api_items`; use `products` to read from the legacy products table).

**Sync vectors:** After seeding the master table from CSV, run `npm run db:sync-vectors` to embed product_name + brands + categories + labels and upsert to Pinecone (batch insertion to avoid timeouts).

---

### GET `/api/search`

Search for food products by keyword (product name or category). Semantic search returns the most relevant products by meaning.

**Query parameters:**

| Param     | Required | Description                             |
| --------- | -------- | --------------------------------------- |
| q or s    | Yes      | Search keywords (e.g. eggs, organic milk) |
| page      | No       | Page number (default: 1)                |
| page_size | No       | Results per page (default: 24, max 100) |

**Example:** `GET /api/search?q=eggs&page_size=12`

**Success (200):**

```json
{
  "count": 12,
  "page": 1,
  "page_size": 12,
  "products": [
    {
      "code": "0715141514643",
      "product_name": "Eggland's Best Cage Free Eggs",
      "brands": "Eggland's Best",
      "categories": "en:eggs",
      "description": "en:eggs • Organic",
      "ecoscore_grade": "b",
      "ecoscore_score": 67,
      "nutriscore_grade": "a",
      "nutriscore_score": -1
    }
  ]
}
```

Results are ordered by vector similarity (semantic match) to the query.

---

### GET `/api/search/enrich`

Same search as `/api/search`, with extra fields for sustainability/health classification (useful for AI agents).

**Query parameters:** Same as `/api/search` (`q`, `brand`, `country`, `page`, `page_size`)

**Example:** `GET /api/search/enrich?q=eggs`

**Success (200):**

```json
{
  "count": 450,
  "page": 1,
  "page_size": 24,
  "products": [
    {
      "code": "0715141514643",
      "product_name": "Eggland's Best Cage Free Eggs",
      "nutriscore_grade": "a",
      "ecoscore_grade": "b",
      "nova_group": 1,
      "off_classification": {
        "code": "0715141514643",
        "product_name": "Eggland's Best Cage Free Eggs",
        "nutriscore_grade": "a",
        "ecoscore_grade": "b",
        "nova_group": 1,
        "sufficient_for_classification": true
      }
    }
  ],
  "sufficient_for_classification": true,
  "insufficient_for_classification": false
}
```

- `sufficient_for_classification`: at least one product has enough data (Nutri-Score, Eco-Score, NOVA, etc.) for classification.
- `insufficient_for_classification`: none of the results have enough classification data; frontend may fall back to the basic search response.

---

## Sustainability assessment

The sustainability assessor uses an LLM (OpenAI gpt-5-mini) to evaluate products. The agent may call Open Food Facts via a tool (`get_product_details`) to fetch full product data (ingredients, labels, etc.) when needed. **OPENAI_API_KEY** is required.

---

### POST `/api/sustainability/assess`

Assess sustainability of each product. Returns the same products with a `sustainability_assessment` on each item (verdict, score, reasoning, better alternatives). Up to 10 products per request.

**Request body (JSON):**

| Field     | Type  | Required | Description                                      |
| --------- | ----- | -------- | ------------------------------------------------ |
| products  | array | Yes      | Product objects (e.g. from search/enrich). Max 10. |

Each product should include at least `code` (barcode). Recommended: `product_name`, `brands`, `ingredients_text`, `ecoscore_grade`, `nutriscore_grade`, `labels_tags` so the agent often does not need to fetch more data.

**Example request body:**

```json
{
  "products": [
    {
      "code": "0715141514643",
      "product_name": "Eggland's Best Cage Free Eggs",
      "brands": "Eggland's Best",
      "ecoscore_grade": "b",
      "nutriscore_grade": "a"
    }
  ]
}
```

**Success (200):**

```json
{
  "products": [
    {
      "code": "0715141514643",
      "product_name": "Eggland's Best Cage Free Eggs",
      "brands": "Eggland's Best",
      "ecoscore_grade": "b",
      "nutriscore_grade": "a",
      "sustainability_assessment": {
        "verdict": "good",
        "score": 78,
        "reasoning": "Cage-free eggs are a solid choice; pasture-raised would be even better for animal welfare.",
        "better_alternatives": ["Prefer pasture-raised eggs when available."]
      }
    }
  ]
}
```

- **verdict:** `"good"` | `"moderate"` | `"poor"`
- **score:** 0–100
- **reasoning:** Short explanation (1–2 sentences).
- **better_alternatives:** Array of short suggestions (e.g. “Prefer pasture-raised eggs”).

If assessment fails for a single product, that item’s `sustainability_assessment` will be `{ "error": "..." }` instead; other products are still returned.

**Errors:** 400 (missing or empty `products`), 500 (server error), 503 (OPENAI_API_KEY missing or invalid).

---

## Shopping list (CRUD)

Authenticated CRUD for a user's shopping list. Each item includes product info and optional sustainability assessment. All endpoints require **Authorization: Bearer &lt;access_token&gt;** (use the `access_token` from login/signup).

### Table setup (Supabase)

Run the migration to create the table and RLS policies:

- **File:** [`supabase/migrations/20250221000000_create_shopping_list.sql`](supabase/migrations/20250221000000_create_shopping_list.sql)
- **Option A:** Supabase Dashboard → SQL Editor → paste and run the migration file contents.
- **Option B:** If using Supabase CLI: `supabase db push` (or `supabase migration up`).

### GET `/api/shopping-list`

List the authenticated user's shopping list items (newest first).

**Headers:** `Authorization: Bearer <access_token>`

**Success (200):**

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "code": "0715141514643",
      "productName": "Eggland's Best Cage Free Eggs",
      "brands": "Eggland's Best",
      "sustainability": {
        "verdict": "good",
        "score": 78,
        "reasoning": "Cage-free eggs are a solid choice...",
        "better_alternatives": ["Prefer pasture-raised eggs when available."]
      },
      "createdAt": "2025-02-21T12:00:00Z",
      "updatedAt": "2025-02-21T12:00:00Z"
    }
  ]
}
```

`sustainability` is `null` if the item has no assessment yet.

**Errors:** 401 (missing/invalid token), 500

---

### POST `/api/shopping-list`

Add an item. Include sustainability when available (e.g. after calling `/api/sustainability/assess`).

**Headers:** `Authorization: Bearer <access_token>`

**Request body (JSON):**

| Field          | Type   | Required | Description                                |
| -------------- | ------ | -------- | ------------------------------------------ |
| code           | string | Yes      | Product barcode                            |
| productName    | string | No       | Display name                               |
| brands         | string | No       | Brand(s)                                   |
| sustainability | object | No       | `{ verdict, score, reasoning, better_alternatives }` |

**Success (200):** `{ "item": { ... } }` (same shape as one element in the list above).

**Errors:** 400 (missing `code`), 401, 500

---

### GET `/api/shopping-list/:id`

Get one item by id.

**Headers:** `Authorization: Bearer <access_token>`

**Success (200):** `{ "item": { ... } }`

**Errors:** 401, 404 (not found or not owned), 500

---

### PATCH `/api/shopping-list/:id`

Update an item. Send only the fields to change.

**Headers:** `Authorization: Bearer <access_token>`

**Request body (JSON):** optional `code`, `productName`, `brands`, `sustainability` (same shape as POST).

**Success (200):** `{ "item": { ... } }`

**Errors:** 401, 404, 500

---

### DELETE `/api/shopping-list/:id`

Remove an item.

**Headers:** `Authorization: Bearer <access_token>`

**Success (200):** `{ "success": true }`

**Errors:** 401, 404, 500

---

## Shopping lists (list of lists)

Authenticated CRUD for **multiple named lists** per user. Each list has many items (same product shape as above). All endpoints require **Authorization: Bearer &lt;access_token&gt;** (use the `access_token` from login/signup).

### Table setup (Supabase)

Run the migration after the legacy shopping list migration:

- **File:** [`supabase/migrations/20250221100000_create_shopping_lists_and_items.sql`](supabase/migrations/20250221100000_create_shopping_lists_and_items.sql)
- **Option A:** Supabase Dashboard → SQL Editor → paste and run the migration file contents.
- **Option B:** If using Supabase CLI: `supabase db push` (or `supabase migration up`).

Creates `shopping_lists` (id, user_id, name, created_at, updated_at) and `shopping_list_items` (id, list_id, code, product_name, brands, sustainability_*, created_at, updated_at) with RLS.

### GET `/api/shopping-lists`

List the authenticated user's shopping lists (newest first).

**Headers:** `Authorization: Bearer <access_token>`

**Success (200):**

```json
{
  "lists": [
    {
      "id": "uuid",
      "name": "Weekly groceries",
      "createdAt": "2025-02-21T12:00:00Z",
      "updatedAt": "2025-02-21T12:00:00Z"
    }
  ]
}
```

**Errors:** 401 (missing/invalid token), 500

---

### POST `/api/shopping-lists`

Create a new shopping list.

**Headers:** `Authorization: Bearer <access_token>`

**Request body (JSON):**

| Field | Type   | Required | Description   |
| ----- | ------ | -------- | ------------- |
| name  | string | Yes      | List name     |

**Success (200):** `{ "list": { "id", "name", "createdAt", "updatedAt" } }`

**Errors:** 400 (missing `name`), 401, 500

---

### GET `/api/shopping-lists/:id`

Get one list with its items. List must belong to the authenticated user (enforced by RLS).

**Headers:** `Authorization: Bearer <access_token>`

**Success (200):**

```json
{
  "list": {
    "id": "uuid",
    "name": "Weekly groceries",
    "createdAt": "2025-02-21T12:00:00Z",
    "updatedAt": "2025-02-21T12:00:00Z"
  },
  "items": [
    {
      "id": "uuid",
      "listId": "uuid",
      "code": "0715141514643",
      "productName": "Eggland's Best Cage Free Eggs",
      "brands": "Eggland's Best",
      "sustainability": { "verdict": "good", "score": 78, "reasoning": "...", "better_alternatives": [] },
      "createdAt": "2025-02-21T12:00:00Z",
      "updatedAt": "2025-02-21T12:00:00Z"
    }
  ]
}
```

`sustainability` is `null` if the item has no assessment yet.

**Errors:** 401, 404 (list not found or not owned), 500

---

### POST `/api/shopping-lists/:id/items`

Add an item to a list. Same product shape as legacy POST `/api/shopping-list`.

**Headers:** `Authorization: Bearer <access_token>`

**Request body (JSON):**

| Field          | Type   | Required | Description                                |
| -------------- | ------ | -------- | ----------------------------------------- |
| code           | string | Yes      | Product barcode                           |
| productName    | string | No       | Display name                              |
| brands         | string | No       | Brand(s)                                  |
| sustainability | object | No       | `{ verdict, score, reasoning, better_alternatives }` |

**Success (200):** `{ "item": { ... } }` (same camelCase item shape as above, including `listId`).

**Errors:** 400 (missing `code`), 401, 404 (list not found or access denied), 500

---

### PATCH `/api/shopping-lists/:listId/items/:itemId`

Update an item. Send only the fields to change.

**Headers:** `Authorization: Bearer <access_token>`

**Request body (JSON):** optional `code`, `productName`, `brands`, `sustainability` (same shape as POST).

**Success (200):** `{ "item": { ... } }`

**Errors:** 401, 404, 500

---

### DELETE `/api/shopping-lists/:listId/items/:itemId`

Remove an item from the list.

**Headers:** `Authorization: Bearer <access_token>`

**Success (200):** `{ "success": true }`

**Errors:** 401, 404, 500

---

## Product Fields Explained

| Field            | Description                                |
| ---------------- | ------------------------------------------ |
| nutriscore_grade | Health score A–E (A = best)                |
| ecoscore_grade   | Environmental score A–E                    |
| nova_group       | Processing level 1–4 (1 = least processed) |
| ingredients_text | Ingredients list                           |
| allergens_tags   | Allergens (e.g. en:eggs, en:gluten)        |
| labels_tags      | Labels (e.g. organic, kosher, cage-free)   |

---

## Error Responses

All errors return JSON:

```json
{ "error": "Error message" }
```

Common status codes:

- **400** – Bad request (missing/invalid parameters)
- **401** – Unauthorized (missing/invalid token)
- **404** – Not found (e.g. shopping list item)
- **500** – Internal server error
- **502** – Upstream service error (e.g. Open Food Facts timeout)
- **503** – Service unavailable (e.g. OPENAI_API_KEY missing for sustainability assessment)

502 responses include retries and clearer messages when Open Food Facts is unavailable.
