-- Add sustainability_tags (AI summary tags) to shopping list item tables.
-- Tags are stored as jsonb array of strings (e.g. ["no-pledge", "bad-ingredients"]).

alter table public.shopping_list
  add column if not exists sustainability_tags jsonb default '[]'::jsonb;

alter table public.shopping_list_items
  add column if not exists sustainability_tags jsonb default '[]'::jsonb;

comment on column public.shopping_list.sustainability_tags is 'AI-generated summary tags (e.g. no pledge, bad ingredients)';
comment on column public.shopping_list_items.sustainability_tags is 'AI-generated summary tags (e.g. no pledge, bad ingredients)';
