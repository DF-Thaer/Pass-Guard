-- Run after SECURE_RECOVERY_MIGRATION.sql.
-- Passkey verification is performed only by the Supabase Edge Function.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.passguard_vault_sessions (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  token_hash text not null unique,
  device_id text not null,
  os text not null default '',
  browser text not null default '',
  screen_res text not null default '',
  ip text not null default '',
  isp text not null default '',
  location text not null default '',
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  revoked_at timestamptz
);

create index if not exists passguard_vault_sessions_vault_id_idx
  on public.passguard_vault_sessions(vault_id, created_at desc);

create table if not exists public.passguard_passkeys (
  credential_id text primary key,
  vault_id uuid not null references public.vaults(id) on delete cascade,
  public_key text not null,
  sign_count bigint not null default 0,
  transports text[] not null default '{}',
  label text not null default '',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists passguard_passkeys_vault_id_idx
  on public.passguard_passkeys(vault_id);

create table if not exists public.passguard_passkey_challenges (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  challenge text not null,
  purpose text not null check (purpose in ('registration', 'authentication')),
  session_token_hash text,
  expires_at timestamptz not null default now() + interval '5 minutes'
);

create table if not exists public.passguard_passkey_tokens (
  token_hash text primary key,
  vault_id uuid not null references public.vaults(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '2 minutes'
);

alter table public.passguard_vault_sessions enable row level security;
alter table public.passguard_passkeys enable row level security;
alter table public.passguard_passkey_challenges enable row level security;
alter table public.passguard_passkey_tokens enable row level security;
revoke all on public.passguard_vault_sessions from anon, authenticated;
revoke all on public.passguard_passkeys from anon, authenticated;
revoke all on public.passguard_passkey_challenges from anon, authenticated;
revoke all on public.passguard_passkey_tokens from anon, authenticated;

create or replace function public.passguard_hash_token(p_token text)
returns text
language sql
immutable
strict
security definer
set search_path = public, extensions
as $$
  select encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

revoke all on function public.passguard_hash_token(text) from public, anon, authenticated;

create or replace function public.passguard_session_is_valid(p_vault_id uuid, p_session_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_session_token is null or p_session_token = '' then
    return false;
  end if;

  update public.passguard_vault_sessions
  set last_seen = now(), expires_at = now() + interval '30 days'
  where vault_id = p_vault_id
    and token_hash = public.passguard_hash_token(p_session_token)
    and revoked_at is null
    and expires_at > now();

  return found;
end;
$$;

revoke all on function public.passguard_session_is_valid(uuid, text) from public, anon, authenticated;

drop function if exists public.login_vault_secure(text, text);
drop function if exists public.log_device_login_secure(uuid, text, text, text, text, text, text, text, text);
drop function if exists public.get_device_logs_secure(uuid, text);
drop function if exists public.save_vault_secure(uuid, text, text, jsonb, text, text);

create or replace function public.consume_passkey_challenge_secure(
  p_challenge_id uuid,
  p_purpose text,
  p_session_token text default null
)
returns table (vault_id uuid, challenge text)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  delete from public.passguard_passkey_challenges c
  where c.id = p_challenge_id
    and c.purpose = p_purpose
    and c.expires_at > now()
    and (
      (p_purpose = 'authentication' and c.session_token_hash is null)
      or (p_purpose = 'registration'
        and c.session_token_hash = public.passguard_hash_token(p_session_token)
        and exists (
          select 1 from public.passguard_vault_sessions s
          where s.vault_id = c.vault_id
            and s.token_hash = c.session_token_hash
            and s.revoked_at is null
            and s.expires_at > now()
        ))
    )
  returning c.vault_id, c.challenge;
end;
$$;

revoke all on function public.consume_passkey_challenge_secure(uuid, text, text) from public, anon, authenticated;
grant execute on function public.consume_passkey_challenge_secure(uuid, text, text) to service_role;

create or replace function public.open_vault_session_secure(
  p_identifier text,
  p_master_password text,
  p_passkey_token text,
  p_device_id text,
  p_os text,
  p_browser text,
  p_screen_res text,
  p_ip text,
  p_isp text,
  p_location text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_vault public.vaults%rowtype;
  v_session_token text;
  v_session_id uuid;
begin
  select * into v_vault
  from public.vaults v
  where v.identifier = lower(trim(p_identifier))
    and v.master_password_hash = crypt(p_master_password, v.master_password_hash)
  for update;

  if not found then
    return null;
  end if;

  if v_vault.is_locked then
    return jsonb_build_object('error', 'locked');
  end if;

  v_session_token := encode(gen_random_bytes(32), 'hex');
  insert into public.passguard_vault_sessions (
    vault_id, token_hash, device_id, os, browser, screen_res, ip, isp, location
  ) values (
    v_vault.id,
    public.passguard_hash_token(v_session_token),
    coalesce(nullif(p_device_id, ''), 'unknown'),
    coalesce(p_os, ''), coalesce(p_browser, ''), coalesce(p_screen_res, ''),
    coalesce(p_ip, ''), coalesce(p_isp, ''), coalesce(p_location, '')
  ) returning id into v_session_id;

  return jsonb_build_object(
    'vault', jsonb_build_object(
      'id', v_vault.id,
      'identifier', v_vault.identifier,
      'email', v_vault.email,
      'phone', v_vault.phone,
      'is_locked', v_vault.is_locked,
      'alert', v_vault.alert,
      'created_at', v_vault.created_at,
      'updated_at', v_vault.updated_at,
      'encrypted_data', v_vault.encrypted_data
    ),
    'session_token', v_session_token,
    'session_id', v_session_id
  );
end;
$$;

create or replace function public.save_vault_secure(
  p_vault_id uuid,
  p_identifier text,
  p_master_password text,
  p_encrypted_data jsonb,
  p_session_token text,
  p_email text default null,
  p_phone text default null
)
returns setof public.vaults
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.passguard_session_is_valid(p_vault_id, p_session_token) then
    raise exception 'vault session revoked or expired';
  end if;

  return query
  update public.vaults v
  set encrypted_data = p_encrypted_data,
      identifier = lower(trim(coalesce(p_identifier, v.identifier))),
      email = coalesce(p_email, v.email),
      phone = coalesce(p_phone, v.phone),
      updated_at = now()
  where v.id = p_vault_id
    and v.master_password_hash = crypt(p_master_password, v.master_password_hash)
  returning v.*;
end;
$$;

drop function if exists public.update_vault_profile_secure(uuid, text, text, text, text, text, jsonb);

create or replace function public.update_vault_profile_secure(
  p_vault_id uuid,
  p_old_master_password text,
  p_new_identifier text,
  p_new_master_password text,
  p_session_token text,
  p_email text,
  p_phone text,
  p_encrypted_data jsonb
)
returns setof public.vaults
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_vault public.vaults%rowtype;
begin
  if not public.passguard_session_is_valid(p_vault_id, p_session_token) then
    raise exception 'vault session revoked or expired';
  end if;

  update public.vaults v
  set identifier = lower(trim(p_new_identifier)),
      email = p_email,
      phone = p_phone,
      encrypted_data = p_encrypted_data,
      master_password_hash = crypt(p_new_master_password, gen_salt('bf', 12)),
      recovery_password_encrypted = encode(pgp_sym_encrypt(p_new_master_password, public.passguard_recovery_key()), 'base64'),
      updated_at = now()
  where v.id = p_vault_id
    and v.master_password_hash = crypt(p_old_master_password, v.master_password_hash)
  returning v.* into v_vault;

  if not found then
    return;
  end if;

  update public.passguard_vault_sessions
  set revoked_at = now()
  where vault_id = p_vault_id
    and token_hash <> public.passguard_hash_token(p_session_token)
    and revoked_at is null;

  return next v_vault;
end;
$$;

create or replace function public.create_vault_session_secure(
  p_vault_id uuid,
  p_master_password text,
  p_passkey_token text,
  p_device_id text,
  p_os text,
  p_browser text,
  p_screen_res text,
  p_ip text,
  p_isp text,
  p_location text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_vault public.vaults%rowtype;
  v_session_token text;
  v_session_id uuid;
begin
  select * into v_vault
  from public.vaults v
  where v.id = p_vault_id
    and v.master_password_hash = crypt(p_master_password, v.master_password_hash)
  for update;

  if not found or v_vault.is_locked then
    return null;
  end if;

  if exists (select 1 from public.passguard_passkeys k where k.vault_id = v_vault.id) then
    delete from public.passguard_passkey_tokens t
    where t.token_hash = public.passguard_hash_token(p_passkey_token)
      and t.vault_id = v_vault.id
      and t.expires_at > now();
    if not found then
      return null;
    end if;
  end if;

  v_session_token := encode(gen_random_bytes(32), 'hex');
  insert into public.passguard_vault_sessions (
    vault_id, token_hash, device_id, os, browser, screen_res, ip, isp, location
  ) values (
    v_vault.id, public.passguard_hash_token(v_session_token),
    coalesce(nullif(p_device_id, ''), 'unknown'), coalesce(p_os, ''), coalesce(p_browser, ''),
    coalesce(p_screen_res, ''), coalesce(p_ip, ''), coalesce(p_isp, ''), coalesce(p_location, '')
  ) returning id into v_session_id;

  return jsonb_build_object('session_token', v_session_token, 'session_id', v_session_id);
end;
$$;

create or replace function public.validate_vault_session_secure(p_session_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_vault_id uuid;
begin
  select s.vault_id into v_vault_id
  from public.passguard_vault_sessions s
  where s.token_hash = public.passguard_hash_token(p_session_token)
    and s.revoked_at is null
    and s.expires_at > now();
  if not found then
    return false;
  end if;
  return public.passguard_session_is_valid(v_vault_id, p_session_token);
end;
$$;

create or replace function public.get_vault_sessions_secure(p_session_token text)
returns table (
  session_id uuid, device_id text, os text, browser text, screen_res text,
  ip text, isp text, location text, created_at timestamptz, last_seen timestamptz,
  expires_at timestamptz, revoked_at timestamptz, is_current boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_vault_id uuid;
  v_token_hash text;
begin
  v_token_hash := public.passguard_hash_token(p_session_token);
  select s.vault_id into v_vault_id
  from public.passguard_vault_sessions s
  where s.token_hash = v_token_hash and s.revoked_at is null and s.expires_at > now();
  if not found or not public.passguard_session_is_valid(v_vault_id, p_session_token) then
    raise exception 'vault session revoked or expired';
  end if;

  return query
  select s.id, s.device_id, s.os, s.browser, s.screen_res, s.ip, s.isp, s.location,
    s.created_at, s.last_seen, s.expires_at, s.revoked_at, s.token_hash = v_token_hash
  from public.passguard_vault_sessions s
  where s.vault_id = v_vault_id
  order by s.created_at desc;
end;
$$;

create or replace function public.revoke_vault_session_secure(p_session_token text, p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_vault_id uuid;
begin
  v_vault_id := null;
  select s.vault_id into v_vault_id
  from public.passguard_vault_sessions s
  where s.token_hash = public.passguard_hash_token(p_session_token)
    and s.revoked_at is null and s.expires_at > now();
  if not found or not public.passguard_session_is_valid(v_vault_id, p_session_token) then
    raise exception 'vault session revoked or expired';
  end if;

  update public.passguard_vault_sessions s
  set revoked_at = now()
  where s.id = p_session_id and s.vault_id = v_vault_id and s.revoked_at is null;
  return found;
end;
$$;

create or replace function public.get_vault_passkeys_secure(p_session_token text)
returns table (credential_id text, label text, created_at timestamptz, last_used_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_vault_id uuid;
begin
  select s.vault_id into v_vault_id
  from public.passguard_vault_sessions s
  where s.token_hash = public.passguard_hash_token(p_session_token)
    and s.revoked_at is null and s.expires_at > now();
  if not found or not public.passguard_session_is_valid(v_vault_id, p_session_token) then
    raise exception 'vault session revoked or expired';
  end if;

  return query
  select k.credential_id, k.label, k.created_at, k.last_used_at
  from public.passguard_passkeys k
  where k.vault_id = v_vault_id
  order by k.created_at desc;
end;
$$;

create or replace function public.remove_vault_passkey_secure(p_session_token text, p_credential_id text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_vault_id uuid;
begin
  select s.vault_id into v_vault_id
  from public.passguard_vault_sessions s
  where s.token_hash = public.passguard_hash_token(p_session_token)
    and s.revoked_at is null and s.expires_at > now();
  if not found or not public.passguard_session_is_valid(v_vault_id, p_session_token) then
    raise exception 'vault session revoked or expired';
  end if;

  delete from public.passguard_passkeys k
  where k.vault_id = v_vault_id and k.credential_id = p_credential_id;
  return found;
end;
$$;

create or replace function public.admin_update_vault_secure(
  p_vault_id uuid,
  p_identifier text,
  p_master_password text,
  p_email text,
  p_phone text,
  p_is_locked boolean,
  p_alert boolean,
  p_encrypted_data jsonb
)
returns setof public.vaults
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_vault public.vaults%rowtype;
begin
  if not exists (select 1 from public.passguard_admins where user_id = auth.uid()) then
    raise exception 'admin access required';
  end if;

  update public.vaults v
  set identifier = lower(trim(p_identifier)),
      email = p_email,
      phone = p_phone,
      is_locked = p_is_locked,
      alert = p_alert,
      encrypted_data = p_encrypted_data,
      master_password_hash = crypt(p_master_password, gen_salt('bf', 12)),
      recovery_password_encrypted = encode(pgp_sym_encrypt(p_master_password, public.passguard_recovery_key()), 'base64'),
      updated_at = now()
  where v.id = p_vault_id
  returning v.* into v_vault;

  if not found then
    return;
  end if;

  update public.passguard_vault_sessions
  set revoked_at = now()
  where vault_id = p_vault_id and revoked_at is null;

  return next v_vault;
end;
$$;

revoke all on function public.open_vault_session_secure(text, text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.create_vault_session_secure(uuid, text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.validate_vault_session_secure(text) from public;
revoke all on function public.get_vault_sessions_secure(text) from public;
revoke all on function public.revoke_vault_session_secure(text, uuid) from public;
revoke all on function public.get_vault_passkeys_secure(text) from public;
revoke all on function public.remove_vault_passkey_secure(text, text) from public;
revoke all on function public.save_vault_secure(uuid, text, text, jsonb, text, text, text) from public;
revoke all on function public.update_vault_profile_secure(uuid, text, text, text, text, text, text, jsonb) from public;
revoke all on function public.admin_update_vault_secure(uuid, text, text, text, text, boolean, boolean, jsonb) from public;

grant execute on function public.open_vault_session_secure(text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.create_vault_session_secure(uuid, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.validate_vault_session_secure(text) to anon, authenticated;
grant execute on function public.get_vault_sessions_secure(text) to anon, authenticated;
grant execute on function public.revoke_vault_session_secure(text, uuid) to anon, authenticated;
grant execute on function public.get_vault_passkeys_secure(text) to anon, authenticated;
grant execute on function public.remove_vault_passkey_secure(text, text) to anon, authenticated;
grant execute on function public.save_vault_secure(uuid, text, text, jsonb, text, text, text) to anon, authenticated;
grant execute on function public.update_vault_profile_secure(uuid, text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_update_vault_secure(uuid, text, text, text, text, boolean, boolean, jsonb) to authenticated;

notify pgrst, 'reload schema';