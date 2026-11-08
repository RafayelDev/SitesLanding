-- PixelForge AI — reproducible schema, RLS, storage, and auth hooks.
-- Run this in the Supabase SQL editor (or via supabase db push).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  monthly_generation_limit integer not null default 50 check (monthly_generation_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  default_style text not null default 'photorealistic',
  default_aspect_ratio text not null default '1:1',
  updated_at timestamptz not null default now()
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt text not null check (char_length(prompt) between 3 and 2000),
  style text not null,
  aspect_ratio text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  error_code text,
  error_message text,
  provider text not null,
  provider_request_id text,
  provider_output_url text,
  retry_count integer not null default 0 check (retry_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.generated_images (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.generation_jobs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_bucket text not null default 'generated-images',
  storage_path text not null unique,
  mime_type text not null,
  byte_size integer check (byte_size is null or byte_size >= 0),
  width integer,
  height integer,
  prompt text not null,
  style text not null,
  aspect_ratio text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  image_id uuid not null references public.generated_images (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, image_id)
);

create table if not exists public.usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid references public.generation_jobs (id) on delete set null,
  kind text not null check (kind in ('generation_success', 'generation_failed')),
  units integer not null default 1 check (units > 0),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists generation_jobs_user_created_idx
  on public.generation_jobs (user_id, created_at desc);

create index if not exists generation_jobs_status_idx
  on public.generation_jobs (status);

create unique index if not exists generation_jobs_provider_request_id_uidx
  on public.generation_jobs (provider_request_id)
  where provider_request_id is not null;

create index if not exists generated_images_user_created_idx
  on public.generated_images (user_id, created_at desc);

create index if not exists generated_images_prompt_idx
  on public.generated_images using gin (to_tsvector('simple', prompt));

create index if not exists usage_records_user_created_idx
  on public.usage_records (user_id, created_at desc);

create index if not exists favorites_image_idx
  on public.favorites (image_id);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists generation_jobs_set_updated_at on public.generation_jobs;
create trigger generation_jobs_set_updated_at
  before update on public.generation_jobs
  for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New user → profile + preferences
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_limit integer;
begin
  begin
    default_limit := current_setting('app.default_monthly_generation_limit', true)::integer;
  exception when others then
    default_limit := 50;
  end;

  insert into public.profiles (id, email, display_name, monthly_generation_limit)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(default_limit, 50)
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Privilege escalation guard
-- ---------------------------------------------------------------------------

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
     or new.monthly_generation_limit is distinct from old.monthly_generation_limit then
    if auth.role() is distinct from 'service_role' then
      raise exception 'refusing to change role or generation limit without service role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_escalation on public.profiles;
create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.generated_images enable row level security;
alter table public.favorites enable row level security;
alter table public.usage_records enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_update_own_safe" on public.profiles;
create policy "profiles_update_own_safe"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "preferences_select_own" on public.user_preferences;
create policy "preferences_select_own"
  on public.user_preferences for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "preferences_update_own" on public.user_preferences;
create policy "preferences_update_own"
  on public.user_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "jobs_select_own" on public.generation_jobs;
create policy "jobs_select_own"
  on public.generation_jobs for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "images_select_own" on public.generated_images;
create policy "images_select_own"
  on public.generated_images for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
  on public.favorites for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
  on public.favorites for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
  on public.favorites for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "usage_select_own" on public.usage_records;
create policy "usage_select_own"
  on public.usage_records for select
  to authenticated
  using (user_id = auth.uid());

-- Authenticated clients cannot insert jobs/images/usage.
-- The Next.js server uses the service role after session validation.

revoke insert, delete on public.generation_jobs from authenticated, anon;
revoke insert, update, delete on public.generated_images from authenticated, anon;
revoke insert, update, delete on public.usage_records from authenticated, anon;
revoke insert, delete on public.profiles from authenticated, anon;
revoke insert, delete on public.user_preferences from authenticated, anon;

grant select on public.profiles to authenticated;
grant update (email, display_name, updated_at) on public.profiles to authenticated;
grant select, update (default_style, default_aspect_ratio, updated_at) on public.user_preferences to authenticated;
grant select on public.generation_jobs to authenticated;
grant select on public.generated_images to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select on public.usage_records to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated-images',
  'generated-images',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "generated_images_select_own_objects" on storage.objects;
create policy "generated_images_select_own_objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'generated-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- No insert/update/delete policies for authenticated users on this bucket.
-- Uploads and deletes go through the service role on the server.
