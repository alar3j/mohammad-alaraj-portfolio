-- =============================================================================
-- TechAlaraj AI waitlist  (Supabase project: wasla)
--
-- Design
--   * All data lives in the private schema `techalaraj`, which is NOT exposed by
--     the Data API. Visitors can never read or list signups.
--   * The browser talks to three SECURITY DEFINER functions in `public`:
--       techalaraj_join_waitlist   - anyone (anon key) can join
--       techalaraj_admin_signups   - requires the admin key
--       techalaraj_admin_delete    - requires the admin key
--   * The admin key is stored only as a bcrypt hash.
--   * Honeypot, input validation, email normalisation and per-IP rate limits
--     are enforced in the database, so a modified client cannot bypass them.
-- =============================================================================

create schema if not exists techalaraj;
revoke all on schema techalaraj from public, anon, authenticated;

-- ---------------------------------------------------------------- tables ----
create table if not exists techalaraj.signups (
  id          bigint generated always as identity primary key,
  name        text        not null check (char_length(name) between 1 and 120),
  email       text        not null check (char_length(email) between 5 and 320),
  source      text        check (source is null or char_length(source) <= 64),
  user_agent  text        check (user_agent is null or char_length(user_agent) <= 512),
  country     text        check (country is null or char_length(country) <= 8),
  created_at  timestamptz not null default now(),
  constraint signups_email_key unique (email)
);
create index if not exists signups_created_at_idx on techalaraj.signups (created_at desc);

-- request log used for rate limiting (rows older than a day are pruned)
create table if not exists techalaraj.hits (
  id    bigint generated always as identity primary key,
  ip    text        not null,
  kind  text        not null check (kind in ('join', 'admin_fail')),
  at    timestamptz not null default now()
);
create index if not exists hits_ip_kind_at_idx on techalaraj.hits (ip, kind, at desc);

create table if not exists techalaraj.admin (
  id          int primary key default 1 check (id = 1),
  key_hash    text        not null,
  updated_at  timestamptz not null default now()
);

alter table techalaraj.signups enable row level security;
alter table techalaraj.hits    enable row level security;
alter table techalaraj.admin   enable row level security;
revoke all on all tables in schema techalaraj from public, anon, authenticated;

-- --------------------------------------------------------------- helpers ----
create or replace function techalaraj.request_header(p_name text)
returns text
language sql stable
set search_path = ''
as $$
  select nullif(btrim(
    coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> p_name
  ), '')
$$;

create or replace function techalaraj.client_ip()
returns text
language sql stable
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(split_part(techalaraj.request_header('x-forwarded-for'), ',', 1)), ''),
    techalaraj.request_header('cf-connecting-ip'),
    techalaraj.request_header('x-real-ip'),
    'unknown'
  )
$$;

-- true when the key matches; failed attempts are rate limited per IP
create or replace function techalaraj.is_admin(p_key text)
returns boolean
language plpgsql volatile
set search_path = ''
as $$
declare
  v_ip    text := techalaraj.client_ip();
  v_hash  text;
  v_fails int;
begin
  select count(*) into v_fails
    from techalaraj.hits
   where ip = v_ip and kind = 'admin_fail' and at > now() - interval '15 minutes';
  if v_fails >= 10 then
    return false;
  end if;

  select key_hash into v_hash from techalaraj.admin where id = 1;
  if v_hash is not null and p_key is not null and char_length(p_key) between 16 and 200
     and extensions.crypt(p_key, v_hash) = v_hash then
    return true;
  end if;

  insert into techalaraj.hits (ip, kind) values (v_ip, 'admin_fail');
  return false;
end
$$;

revoke all on all functions in schema techalaraj from public, anon, authenticated;

-- ------------------------------------------------------------ public API ----
create or replace function public.techalaraj_join_waitlist(
  p_name    text,
  p_email   text,
  p_source  text default null,
  p_website text default null   -- honeypot: humans never fill it
)
returns jsonb
language plpgsql volatile
security definer
set search_path = ''
as $$
declare
  v_ip     text := techalaraj.client_ip();
  v_name   text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 120);
  v_email  text := lower(btrim(coalesce(p_email, '')));
  v_source text := nullif(left(regexp_replace(lower(btrim(coalesce(p_source, ''))), '[^a-z0-9_.-]', '', 'g'), 64), '');
  v_id     bigint;
  v_recent int;
begin
  if coalesce(btrim(p_website), '') <> '' then
    return jsonb_build_object('status', 'created');          -- bot: pretend success
  end if;

  if v_name = '' or char_length(v_email) > 320
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  select count(*) into v_recent
    from techalaraj.hits
   where ip = v_ip and kind = 'join' and at > now() - interval '10 minutes';
  if v_recent >= 8 then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  insert into techalaraj.hits (ip, kind) values (v_ip, 'join');

  -- opportunistic pruning keeps the log tiny
  if random() < 0.05 then
    delete from techalaraj.hits where at < now() - interval '1 day';
  end if;

  insert into techalaraj.signups (name, email, source, user_agent, country)
  values (
    v_name,
    v_email,
    v_source,
    left(techalaraj.request_header('user-agent'), 512),
    upper(left(coalesce(techalaraj.request_header('cf-ipcountry'),
                        techalaraj.request_header('x-country-code')), 8))
  )
  on conflict (email) do nothing
  returning id into v_id;

  return jsonb_build_object('status', case when v_id is null then 'duplicate' else 'created' end);
end
$$;

create or replace function public.techalaraj_admin_signups(p_key text)
returns jsonb
language plpgsql volatile
security definer
set search_path = ''
as $$
begin
  if not techalaraj.is_admin(p_key) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'total', (select count(*) from techalaraj.signups),
    'today', (select count(*) from techalaraj.signups where created_at > now() - interval '24 hours'),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.created_at desc, s.id desc)
        from techalaraj.signups s
    ), '[]'::jsonb)
  );
end
$$;

create or replace function public.techalaraj_admin_delete(p_key text, p_id bigint)
returns jsonb
language plpgsql volatile
security definer
set search_path = ''
as $$
begin
  if not techalaraj.is_admin(p_key) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  delete from techalaraj.signups where id = p_id;
  return jsonb_build_object('ok', true);
end
$$;

revoke all on function public.techalaraj_join_waitlist(text, text, text, text) from public;
revoke all on function public.techalaraj_admin_signups(text)                   from public;
revoke all on function public.techalaraj_admin_delete(text, bigint)            from public;
grant execute on function public.techalaraj_join_waitlist(text, text, text, text) to anon, authenticated;
grant execute on function public.techalaraj_admin_signups(text)                   to anon, authenticated;
grant execute on function public.techalaraj_admin_delete(text, bigint)            to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Set / rotate the admin key (run in the Supabase SQL editor, never commit it):
--   insert into techalaraj.admin (id, key_hash)
--   values (1, extensions.crypt('YOUR-LONG-RANDOM-KEY', extensions.gen_salt('bf', 10)))
--   on conflict (id) do update set key_hash = excluded.key_hash, updated_at = now();
-- -----------------------------------------------------------------------------
