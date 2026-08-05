-- Repair shopping-list item writes in environments where grants, RLS
-- policies, or the sustainability_tags column are missing or out of date.

begin;

alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.shopping_list enable row level security;

alter table public.shopping_list_items
  add column if not exists sustainability_tags jsonb default '[]'::jsonb;

alter table public.shopping_list_items
  add column if not exists sustainability_confidence text,
  add column if not exists sustainability_sources jsonb default '[]'::jsonb,
  add column if not exists sustainability_assessment_version text,
  add column if not exists sustainability_assessed_at timestamptz;

alter table public.shopping_list
  add column if not exists sustainability_tags jsonb default '[]'::jsonb,
  add column if not exists sustainability_confidence text,
  add column if not exists sustainability_sources jsonb default '[]'::jsonb,
  add column if not exists sustainability_assessment_version text,
  add column if not exists sustainability_assessed_at timestamptz;

grant select, insert, update, delete
  on table public.shopping_lists
  to authenticated;

grant select, insert, update, delete
  on table public.shopping_list_items
  to authenticated;

grant select, insert, update, delete
  on table public.shopping_list
  to authenticated;

drop policy if exists "Users can manage own shopping items"
  on public.shopping_list;
drop policy if exists "Users can view own legacy shopping items"
  on public.shopping_list;
drop policy if exists "Users can create own legacy shopping items"
  on public.shopping_list;
drop policy if exists "Users can update own legacy shopping items"
  on public.shopping_list;
drop policy if exists "Users can delete own legacy shopping items"
  on public.shopping_list;

create policy "Users can view own legacy shopping items"
  on public.shopping_list for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can create own legacy shopping items"
  on public.shopping_list for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update own legacy shopping items"
  on public.shopping_list for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users can delete own legacy shopping items"
  on public.shopping_list for delete to authenticated
  using (auth.uid() = user_id);

-- Replace the original broad policies and make every operation explicit.
drop policy if exists "Users can manage own shopping lists"
  on public.shopping_lists;
drop policy if exists "Users can view own shopping lists"
  on public.shopping_lists;
drop policy if exists "Users can create own shopping lists"
  on public.shopping_lists;
drop policy if exists "Users can update own shopping lists"
  on public.shopping_lists;
drop policy if exists "Users can delete own shopping lists"
  on public.shopping_lists;

create policy "Users can view own shopping lists"
  on public.shopping_lists
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create own shopping lists"
  on public.shopping_lists
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own shopping lists"
  on public.shopping_lists
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own shopping lists"
  on public.shopping_lists
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can manage items in own lists"
  on public.shopping_list_items;
drop policy if exists "Users can view items in own lists"
  on public.shopping_list_items;
drop policy if exists "Users can create items in own lists"
  on public.shopping_list_items;
drop policy if exists "Users can update items in own lists"
  on public.shopping_list_items;
drop policy if exists "Users can delete items in own lists"
  on public.shopping_list_items;

create policy "Users can view items in own lists"
  on public.shopping_list_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.shopping_lists as sl
      where sl.id = shopping_list_items.list_id
        and sl.user_id = auth.uid()
    )
  );

create policy "Users can create items in own lists"
  on public.shopping_list_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.shopping_lists as sl
      where sl.id = shopping_list_items.list_id
        and sl.user_id = auth.uid()
    )
  );

create policy "Users can update items in own lists"
  on public.shopping_list_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.shopping_lists as sl
      where sl.id = shopping_list_items.list_id
        and sl.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.shopping_lists as sl
      where sl.id = shopping_list_items.list_id
        and sl.user_id = auth.uid()
    )
  );

create policy "Users can delete items in own lists"
  on public.shopping_list_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.shopping_lists as sl
      where sl.id = shopping_list_items.list_id
        and sl.user_id = auth.uid()
    )
  );

create index if not exists shopping_list_items_list_id_idx
  on public.shopping_list_items (list_id);

notify pgrst, 'reload schema';

commit;
