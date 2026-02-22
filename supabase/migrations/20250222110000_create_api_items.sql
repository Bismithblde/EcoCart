-- Master product table for semantic search (api_items).
-- Schema: id, product_name, brands, categories, labels, ingredients, allergens, nutriments, quantity, eco_score, grade.
-- Data can be seeded from CSV in public (e.g. en.openfoodfacts.org.products.usa.csv) or copied from products.

create table if not exists public.api_items (
  id text primary key,
  product_name text,
  brands text,
  categories text,
  labels text,
  ingredients text,
  allergens text,
  nutriments jsonb default '{}'::jsonb,
  quantity text,
  eco_score double precision,
  grade text,
  created_at timestamptz not null default now()
);

-- Add missing columns when table already exists with a different schema (idempotent)
alter table public.api_items add column if not exists product_name text;
alter table public.api_items add column if not exists brands text;
alter table public.api_items add column if not exists categories text;
alter table public.api_items add column if not exists labels text;
alter table public.api_items add column if not exists ingredients text;
alter table public.api_items add column if not exists allergens text;
alter table public.api_items add column if not exists nutriments jsonb default '{}'::jsonb;
alter table public.api_items add column if not exists quantity text;
alter table public.api_items add column if not exists eco_score double precision;
alter table public.api_items add column if not exists grade text;
alter table public.api_items add column if not exists created_at timestamptz not null default now();

create index if not exists idx_api_items_product_name on public.api_items (product_name);
create index if not exists idx_api_items_brands on public.api_items (brands);
create index if not exists idx_api_items_grade on public.api_items (grade);

comment on table public.api_items is 'Master product catalog for semantic search; id links to Pinecone vectors.';

alter table public.api_items enable row level security;

drop policy if exists "api_items readable by everyone" on public.api_items;
create policy "api_items readable by everyone"
  on public.api_items for select
  using (true);
