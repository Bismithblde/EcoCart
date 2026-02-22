-- Shopping list table: product + optional sustainability
-- Run in Supabase SQL Editor or via: supabase db push

create table if not exists public.shopping_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

alter table public.shopping_list enable row level security;

create policy "Users can manage own shopping list"
  on public.shopping_list
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger to refresh updated_at on update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger shopping_list_updated_at
  before update on public.shopping_list
  for each row execute function public.set_updated_at();
