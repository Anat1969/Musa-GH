-- MUSA (Muse Meridian) in the shared cultura-GH project. Applied 2026-10-15.
create table if not exists public.musa_generations (
  id uuid primary key default gen_random_uuid(),
  source text not null check (char_length(source) between 1 and 600),
  mode text not null check (mode in ('board','illustration','art')),
  image_url text,              -- null until the image exists (fal key missing or failed)
  hebrew_interpretation text not null,
  visual_prompt text not null,
  spatial_identity text,
  created_at timestamptz not null default now()
);
create index if not exists musa_generations_created_idx on public.musa_generations (created_at desc);
create index if not exists musa_generations_source_idx on public.musa_generations (source, mode);
alter table public.musa_generations enable row level security;
create policy "musa read all" on public.musa_generations for select to anon, authenticated using (true);
-- no insert/update/delete policies: writes only through the musa-generate function (service role)

insert into storage.buckets (id, name, public) values ('musa-media','musa-media', true) on conflict (id) do nothing;
create policy "musa media public read" on storage.objects for select to anon, authenticated using (bucket_id = 'musa-media');

alter publication supabase_realtime add table public.musa_generations;
