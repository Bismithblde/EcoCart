# Ecocart

Ecocart is a full-stack sustainability platform that helps users evaluate the environmental and ethical impact of food and household products. It combines structured product data, semantic search, and an intelligent sustainability agent to make responsible purchasing decisions easier and faster.

## Overview

Ecocart allows users to:

- **Search** for food and household products using semantic similarity
- **View** sustainability scores with clear reasoning
- **Get** concrete alternative suggestions
- **Create and manage** persistent shopping lists
- **See** per-item sustainability assessments inside saved lists

The system is built for speed, clarity, and real-world usability. Sustainability insights are integrated directly into search results and shopping workflows rather than presented as isolated reports.

## Architecture

### 1. Full-Stack Framework

Ecocart is built with **Next.js** as a full-stack framework, providing:

- File-based routing
- Server-side rendering
- Unified frontend and backend logic

### 2. Data Pipeline

Product data originates from **Open Food Facts**. The pipeline includes:

- Preprocessing scripts to extract essential attributes and reduce dataset size
- Cleaned data stored in **Supabase** with a relational schema
- Supabase also handles authentication and persistent shopping lists

### 3. Semantic Search

Search is powered by embeddings and a vector database using **Pinecone**:

- Separate embeddings for product name, brand, and categories
- Weighted multi-signal similarity ranking with brand-first prioritization
- Deduplication of identical unbranded entries

**Flow:** User query → vector search retrieves best-matching product IDs → relational DB loads full product records → sustainability agent can evaluate selected products.

### 4. Sustainability Assessment Agent

The sustainability agent is a tool-using LLM system built with **OpenAI** (e.g. `gpt-5-mini`). It evaluates products based on:

- Environmental impact
- Ingredients and sourcing
- Ethical considerations
- Brand-level sustainability context

**Input:** Product name, brand, categories, labels, ingredients, ecoscore (if available).

**Output (structured JSON):** Verdict (good / moderate / poor), score (0–100), reasoning, better alternatives, and summary tags.

The agent runs in a controlled multi-turn loop and can call tools such as product detail retrieval (Open Food Facts) and web search for sustainability context. Outputs are validated before being returned to the frontend.

### 5. Shopping Lists

Users can create, rename, and delete lists, and add or remove products. When a product is added, the sustainability agent runs in the background and stores the score and tags with the item, so users can evaluate their entire cart at a glance.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend & Backend | Next.js |
| Database | Supabase (Postgres + Auth) |
| Vector Search | Pinecone |
| LLM | OpenAI |
| External Data | Open Food Facts |

## Getting Started

### Prerequisites

- Node.js (v18+)
- Supabase project
- Pinecone index
- OpenAI API key

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Supabase (https://supabase.com/dashboard/project/_/settings/api)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
# For seeding/sync scripts
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Search + sustainability
OPENAI_API_KEY=your-openai-api-key
PINECONE_API_KEY=your-pinecone-api-key
# Optional: PINECONE_INDEX_NAME=hopperhacks, MASTER_TABLE=api_items

# Optional: for agent web search (sustainability context)
SERPER_API_KEY=your-serper-api-key
```

### Run the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Note (Windows):** The dev script uses `next dev --webpack` to avoid a known Turbopack + PostCSS timeout when processing `app/globals.css`. To use Turbopack, run `npx next dev` instead.

### Data & Scripts

- **Seed products:** `npm run db:seed-api-items` or `npm run db:seed-products` (requires CSV and Supabase env)
- **Sync vectors to Pinecone:** `npm run db:sync-vectors` (requires OpenAI, Pinecone, Supabase env)

## Key Design Principles

- **Performance first:** Fast search and responsive scoring
- **Structured outputs:** Schema validation for reliability
- **Explainability:** Clear reasoning behind every score
- **User experience:** Clean results, deduplication, actionable alternatives
- **Real-world impact:** Sustainability integrated into actual shopping behavior

## What This Project Demonstrates

- Large-scale data preprocessing
- Embedding generation and vector storage (Pinecone)
- Multi-namespace vector search with weighted ranking
- Tool-augmented LLM orchestration
- Structured AI output validation
- Full-stack system design with Next.js

## Future Improvements

- Expanded sustainability datasets
- Personalized scoring preferences
- Hybrid keyword + embedding retrieval
- Browser extension and barcode scanning
- Deeper brand-level sustainability analysis

---

Ecocart is designed to turn sustainability from abstract information into an actionable part of everyday purchasing decisions.
