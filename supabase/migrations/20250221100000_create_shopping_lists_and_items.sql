-- Shopping lists (list of lists per user) and list items.
-- Run after 20250221000000_create_shopping_list.sql (set_updated_at exists).
-- Optionally migrate data from shopping_list to shopping_list_items later.

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopping_lists enable row level security;

create policy "Users can manage own shopping lists"
  on public.shopping_lists
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger shopping_lists_updated_at
  before update on public.shopping_lists
  for each row execute function public.set_updated_at();

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  code text not null,
  product_name text,
  brands text,
  sustainability_verdict text check (sustainability_verdict in ('good', 'moderate', 'poor')),
  sustainability_score smallint check (sustainability_score >= 0 and sustainability_score <= 100),
  sustainability_reasoning text,
  sustainability_better_alternatives jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopping_list_items enable row level security;

create policy "Users can manage items in own lists"
  on public.shopping_list_items
  for all
  using (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = shopping_list_items.list_id and sl.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = shopping_list_items.list_id and sl.user_id = auth.uid()
    )
  );

create trigger shopping_list_items_updated_at
  before update on public.shopping_list_items
  for each row execute function public.set_updated_at();
