-- Store the visitor's IANA time zone (e.g. Asia/Amman) as a privacy-friendly
-- hint of where signups come from (the Edge runtime does not expose a country).
alter table techalaraj.signups
  add column if not exists timezone text check (timezone is null or char_length(timezone) <= 64);

drop function if exists techalaraj.join_waitlist(text, text, text, text, text, text);

create or replace function techalaraj.join_waitlist(
  p_name       text,
  p_email      text,
  p_source     text,
  p_ip         text,
  p_user_agent text,
  p_country    text,
  p_timezone   text
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
  v_tz     text := nullif(left(regexp_replace(btrim(coalesce(p_timezone, '')), '[^A-Za-z0-9_/+-]', '', 'g'), 64), '');
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

  if random() < 0.05 then
    delete from techalaraj.hits where at < now() - interval '1 day';
  end if;

  insert into techalaraj.signups (name, email, source, user_agent, country, timezone)
  values (
    v_name,
    v_email,
    v_source,
    nullif(left(btrim(coalesce(p_user_agent, '')), 512), ''),
    nullif(upper(left(btrim(coalesce(p_country, '')), 8)), ''),
    v_tz
  )
  on conflict (email) do nothing
  returning id into v_id;

  return jsonb_build_object('status', case when v_id is null then 'duplicate' else 'created' end);
end
$$;

revoke all on all functions in schema techalaraj from public, anon, authenticated;
