-- Chạy toàn bộ file này một lần trong Supabase Dashboard > SQL Editor.
create table if not exists public.larmx_songs (
  id text primary key,
  title text not null,
  artist text not null,
  album text not null default 'LARMX MUSIC',
  genre text not null default 'LARMX MUSIC',
  duration integer not null default 240,
  cover text not null,
  audio text not null,
  accent text not null default '#c45cff',
  storage_path text,
  created_at timestamptz not null default now()
);
alter table public.larmx_songs alter column album set default 'LARMX MUSIC';
alter table public.larmx_songs alter column genre set default 'LARMX MUSIC';
alter table public.larmx_songs add column if not exists featured boolean not null default true;
alter table public.larmx_songs add column if not exists featured_artist boolean not null default true;
alter table public.larmx_songs add column if not exists home_order integer;
alter table public.larmx_songs add column if not exists deleted_at timestamptz;
alter table public.larmx_songs add column if not exists audio_provider text not null default 'supabase';
alter table public.larmx_songs add column if not exists cover_provider text not null default 'supabase';
alter table public.larmx_songs add column if not exists cover_storage_path text;
alter table public.larmx_songs drop constraint if exists larmx_songs_audio_provider_check;
alter table public.larmx_songs add constraint larmx_songs_audio_provider_check check (audio_provider in ('external', 'supabase', 'r2'));
alter table public.larmx_songs drop constraint if exists larmx_songs_cover_provider_check;
alter table public.larmx_songs add constraint larmx_songs_cover_provider_check check (cover_provider in ('external', 'supabase', 'r2'));
create index if not exists larmx_songs_deleted_at_idx on public.larmx_songs (deleted_at);
update public.larmx_songs set album = 'LARMX MUSIC' where album = 'LARMX Select';
update public.larmx_songs set genre = 'LARMX MUSIC' where genre = 'LARMX Select';

alter table public.larmx_songs enable row level security;
drop policy if exists "Public can listen to LARMX songs" on public.larmx_songs;
drop policy if exists "Studio can publish LARMX songs" on public.larmx_songs;
drop policy if exists "Studio can remove LARMX songs" on public.larmx_songs;
drop policy if exists "Studio can arrange LARMX songs" on public.larmx_songs;
create policy "Public can listen to LARMX songs" on public.larmx_songs for select to anon, authenticated using (true);
create policy "Studio can publish LARMX songs" on public.larmx_songs for insert to anon, authenticated with check (true);
create policy "Studio can remove LARMX songs" on public.larmx_songs for delete to anon, authenticated using (true);
create policy "Studio can arrange LARMX songs" on public.larmx_songs for update to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.larmx_songs to anon, authenticated;

-- Broadcast song inserts, updates and deletes to the Home page in real time.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'larmx_songs'
  ) then
    alter publication supabase_realtime add table public.larmx_songs;
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('larmx-audio', 'larmx-audio', true, 209715200, array['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg'])
on conflict (id) do update set public = true, file_size_limit = 209715200;

drop policy if exists "Studio can upload public audio" on storage.objects;
drop policy if exists "Studio can delete public audio" on storage.objects;
create policy "Studio can upload public audio" on storage.objects for insert to anon, authenticated with check (bucket_id = 'larmx-audio');
create policy "Studio can delete public audio" on storage.objects for delete to anon, authenticated using (bucket_id = 'larmx-audio');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('larmx-covers', 'larmx-covers', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "Studio can upload public covers" on storage.objects;
drop policy if exists "Studio can update public covers" on storage.objects;
drop policy if exists "Studio can delete public covers" on storage.objects;
create policy "Studio can upload public covers" on storage.objects for insert to anon, authenticated with check (bucket_id = 'larmx-covers');
create policy "Studio can update public covers" on storage.objects for update to anon, authenticated using (bucket_id = 'larmx-covers') with check (bucket_id = 'larmx-covers');
create policy "Studio can delete public covers" on storage.objects for delete to anon, authenticated using (bucket_id = 'larmx-covers');

-- Force PostgREST to recognize newly added columns immediately.
notify pgrst, 'reload schema';
