-- Products table for Open Food Facts USA CSV data.
-- Enables local/search over products without hitting OFF API rate limits.

create table if not exists public.products (
  code text primary key,
  product_name text,
  brands text,
  categories text,
  labels text,
  ingredients_text text,
  allergens text,
  quantity text,
  ecoscore_grade text,
  ecoscore_score double precision,
  nutriments jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Search / filter by name and brand
create index if not exists idx_products_product_name on public.products (product_name);
create index if not exists idx_products_brands on public.products (brands);
create index if not exists idx_products_ecoscore_grade on public.products (ecoscore_grade);

comment on table public.products is 'Open Food Facts product catalog (USA); seeded from en.openfoodfacts.org.products.usa.csv';

alter table public.products enable row level security;

-- Allow read for everyone (anon + authenticated); writes only via service role or backend
create policy "Products are readable by everyone"
  on public.products
  for select
  using (true);
