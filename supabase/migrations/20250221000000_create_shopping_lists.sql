-- Reproducible shopping-list schema for fresh environments.

begin;

create table if not exists public.shopping_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  product_name text,
  brands text,
  sustainability_verdict text check (sustainability_verdict in ('good', 'moderate', 'poor')),
  sustainability_score integer check (sustainability_score between 0 and 100),
  sustainability_reasoning text,
  sustainability_better_alternatives jsonb default '[]'::jsonb,
  sustainability_tags jsonb default '[]'::jsonb,
  sustainability_confidence text check (sustainability_confidence in ('low', 'medium', 'high')),
  sustainability_sources jsonb default '[]'::jsonb,
  sustainability_assessment_version text,
  sustainability_assessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  code text not null,
  product_name text,
  brands text,
  sustainability_verdict text check (sustainability_verdict in ('good', 'moderate', 'poor')),
  sustainability_score integer check (sustainability_score between 0 and 100),
  sustainability_reasoning text,
  sustainability_better_alternatives jsonb default '[]'::jsonb,
  sustainability_tags jsonb default '[]'::jsonb,
  sustainability_confidence text check (sustainability_confidence in ('low', 'medium', 'high')),
  sustainability_sources jsonb default '[]'::jsonb,
  sustainability_assessment_version text,
  sustainability_assessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (list_id, code)
);

create index if not exists shopping_list_user_id_idx
  on public.shopping_list (user_id);
create index if not exists shopping_lists_user_id_idx
  on public.shopping_lists (user_id);
create index if not exists shopping_list_items_list_id_idx
  on public.shopping_list_items (list_id);

alter table public.shopping_list enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;

grant select, insert, update, delete on public.shopping_list to authenticated;
grant select, insert, update, delete on public.shopping_lists to authenticated;
grant select, insert, update, delete on public.shopping_list_items to authenticated;

drop policy if exists "Users can view own legacy shopping items" on public.shopping_list;
drop policy if exists "Users can create own legacy shopping items" on public.shopping_list;
drop policy if exists "Users can update own legacy shopping items" on public.shopping_list;
drop policy if exists "Users can delete own legacy shopping items" on public.shopping_list;

create policy "Users can view own legacy shopping items"
  on public.shopping_list for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can create own legacy shopping items"
  on public.shopping_list for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update own legacy shopping items"
  on public.shopping_list for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own legacy shopping items"
  on public.shopping_list for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can view own shopping lists" on public.shopping_lists;
drop policy if exists "Users can create own shopping lists" on public.shopping_lists;
drop policy if exists "Users can update own shopping lists" on public.shopping_lists;
drop policy if exists "Users can delete own shopping lists" on public.shopping_lists;

create policy "Users can view own shopping lists"
  on public.shopping_lists for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can create own shopping lists"
  on public.shopping_lists for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update own shopping lists"
  on public.shopping_lists for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own shopping lists"
  on public.shopping_lists for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can view items in own lists" on public.shopping_list_items;
drop policy if exists "Users can create items in own lists" on public.shopping_list_items;
drop policy if exists "Users can update items in own lists" on public.shopping_list_items;
drop policy if exists "Users can delete items in own lists" on public.shopping_list_items;

create policy "Users can view items in own lists"
  on public.shopping_list_items for select to authenticated
  using (
    exists (
      select 1 from public.shopping_lists as lists
      where lists.id = shopping_list_items.list_id
        and lists.user_id = auth.uid()
    )
  );
create policy "Users can create items in own lists"
  on public.shopping_list_items for insert to authenticated
  with check (
    exists (
      select 1 from public.shopping_lists as lists
      where lists.id = shopping_list_items.list_id
        and lists.user_id = auth.uid()
    )
  );
create policy "Users can update items in own lists"
  on public.shopping_list_items for update to authenticated
  using (
    exists (
      select 1 from public.shopping_lists as lists
      where lists.id = shopping_list_items.list_id
        and lists.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shopping_lists as lists
      where lists.id = shopping_list_items.list_id
        and lists.user_id = auth.uid()
    )
  );
create policy "Users can delete items in own lists"
  on public.shopping_list_items for delete to authenticated
  using (
    exists (
      select 1 from public.shopping_lists as lists
      where lists.id = shopping_list_items.list_id
        and lists.user_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';

commit;
