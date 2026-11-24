-- =============================================================================
-- TechAlaraj AI waitlist - move the API behind an Edge Function.
--
-- The wasla project runs with the Data API (PostgREST) switched off, so the
-- browser cannot call database functions directly. The Edge Function
-- `techalaraj-waitlist` connects with SUPABASE_DB_URL and calls the functions
-- below; nothing in the `techalaraj` schema is reachable from the internet
-- except through that function.
-- =============================================================================

drop function if exists public.techalaraj_join_waitlist(text, text, text, text);
drop function if exists public.techalaraj_admin_signups(text);
drop function if exists public.techalaraj_admin_delete(text, bigint);
drop function if exists techalaraj.is_admin(text);
drop function if exists techalaraj.client_ip();
drop function if exists techalaraj.request_header(text);

-- true when the key matches; failed attempts are rate limited per IP
create or replace function techalaraj.is_admin(p_key text, p_ip text)
returns boolean
language plpgsql volatile
set search_path = ''
as $$
declare
  v_ip    text := coalesce(nullif(btrim(p_ip), ''), 'unknown');
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

create or replace function techalaraj.join_waitlist(
  p_name       text,
  p_email      text,
  p_source     text,
  p_ip         text,
  p_user_agent text,
  p_country    text
)
returns jsonb
language plpgsql volatile
set search_path = ''
as $$
declare
  v_ip     text := coalesce(nullif(btrim(p_ip), ''), 'unknown');
  v_name   text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 120);
  v_email  text := lower(btrim(coalesce(p_email, '')));
  v_source text := nullif(left(regexp_replace(lower(btrim(coalesce(p_source, ''))), '[^a-z0-9_.-]', '', 'g'), 64), '');
  v_id     bigint;
  v_recent int;
begin
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
    nullif(left(btrim(coalesce(p_user_agent, '')), 512), ''),
    nullif(upper(left(btrim(coalesce(p_country, '')), 8)), '')
  )
  on conflict (email) do nothing
  returning id into v_id;

  return jsonb_build_object('status', case when v_id is null then 'duplicate' else 'created' end);
end
$$;

create or replace function techalaraj.admin_signups(p_key text, p_ip text)
returns jsonb
language plpgsql volatile
set search_path = ''
as $$
begin
  if not techalaraj.is_admin(p_key, p_ip) then
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

create or replace function techalaraj.admin_delete(p_key text, p_ip text, p_id bigint)
returns jsonb
language plpgsql volatile
set search_path = ''
as $$
begin
  if not techalaraj.is_admin(p_key, p_ip) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  delete from techalaraj.signups where id = p_id;
  return jsonb_build_object('ok', true);
end
$$;

revoke all on all functions in schema techalaraj from public, anon, authenticated;
