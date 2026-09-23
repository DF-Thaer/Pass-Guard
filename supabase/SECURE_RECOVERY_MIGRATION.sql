-- Pass-Guard secure password recovery migration
-- Run this once in the Supabase SQL editor.
-- Before running: replace the admin UUID in the final INSERT with auth.users.id.

create extension if not exists pgcrypto with schema extensions;

alter table public.vaults
  add column if not exists master_password_hash text,
  add column if not exists recovery_password_encrypted text;

create table if not exists public.passguard_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.passguard_admins enable row level security;

create or replace function public.passguard_recovery_key()
returns text
language sql
security definer
set search_path = public, vault
stable
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'passguard_recovery_key'
  limit 1;
$$;

-- Create this Vault secret once. Do not expose it to the client.
select vault.create_secret(
  encode(gen_random_bytes(32), 'hex'),
  'passguard_recovery_key',
  'Pass-Guard server-side recovery encryption key'
)
where not exists (
  select 1 from vault.secrets where name = 'passguard_recovery_key'
);

-- Migrate existing plaintext recovery passwords before removing them.
update public.vaults
set
  master_password_hash = crypt(support_master_password, gen_salt('bf', 12)),
  recovery_password_encrypted = encode(
    pgp_sym_encrypt(support_master_password, public.passguard_recovery_key()),
    'base64'
  )
where support_master_password is not null
  and support_master_password <> ''
  and master_password_hash is null;

alter table public.vaults drop column if exists support_master_password;

create or replace function public.register_vault_secure(
  p_identifier text,
  p_master_password text,
  p_email text default '',
  p_phone text default '',
  p_encrypted_data jsonb default 'null'::jsonb
)
returns setof public.vaults
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if exists (select 1 from public.vaults where identifier = lower(trim(p_identifier))) then
    return;
  end if;

  return query
  insert into public.vaults (
    identifier, email, phone, is_locked, alert,
    master_password_hash, recovery_password_encrypted, encrypted_data
  ) values (
    lower(trim(p_identifier)), p_email, p_phone, false, false,
    crypt(p_master_password, gen_salt('bf', 12)),
    encode(pgp_sym_encrypt(p_master_password, public.passguard_recovery_key()), 'base64'),
    p_encrypted_data
  )
  returning *;
end;
$$;

create or replace function public.login_vault_secure(
  p_identifier text,
  p_master_password text
)
returns setof public.vaults
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  select * from public.vaults v
  where v.identifier = lower(trim(p_identifier))
    and v.master_password_hash = crypt(p_master_password, v.master_password_hash);
end;
$$;

create or replace function public.save_vault_secure(
  p_vault_id uuid,
  p_identifier text,
  p_master_password text,
  p_encrypted_data jsonb,
  p_email text default null,
  p_phone text default null
)
returns setof public.vaults
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
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

create or replace function public.update_vault_profile_secure(
  p_vault_id uuid,
  p_old_master_password text,
  p_new_identifier text,
  p_new_master_password text,
  p_email text default '',
  p_phone text default '',
  p_encrypted_data jsonb default 'null'::jsonb
)
returns setof public.vaults
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
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
  returning v.*;
end;
$$;

create or replace function public.admin_reveal_vault(p_vault_id uuid)
returns table (master_password text, encrypted_data jsonb)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (select 1 from public.passguard_admins where user_id = auth.uid()) then
    raise exception 'admin access required';
  end if;

  return query
  select
    pgp_sym_decrypt(decode(v.recovery_password_encrypted, 'base64'), public.passguard_recovery_key()),
    v.encrypted_data
  from public.vaults v
  where v.id = p_vault_id;
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
begin
  if not exists (select 1 from public.passguard_admins where user_id = auth.uid()) then
    raise exception 'admin access required';
  end if;

  return query
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
  returning v.*;
end;
$$;

create or replace function public.log_device_login_secure(
  p_vault_id uuid,
  p_master_password text,
  p_device_id text,
  p_os text,
  p_browser text,
  p_screen_res text,
  p_ip text,
  p_isp text,
  p_location text
)
returns setof public.vault_device_logs
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.vaults v
    where v.id = p_vault_id
      and v.master_password_hash = crypt(p_master_password, v.master_password_hash)
  ) then
    raise exception 'invalid vault credentials';
  end if;

  update public.vault_device_logs
  set is_current = false
  where vault_id = p_vault_id;

  insert into public.vault_device_logs (
    vault_id, device_id, os, browser, screen_res, ip, isp, location, last_login, is_current
  ) values (
    p_vault_id, p_device_id, p_os, p_browser, p_screen_res, p_ip, p_isp, p_location, now(), true
  )
  on conflict (vault_id, device_id) do update set
    os = excluded.os,
    browser = excluded.browser,
    screen_res = excluded.screen_res,
    ip = excluded.ip,
    isp = excluded.isp,
    location = excluded.location,
    last_login = excluded.last_login,
    is_current = true;

  return query
  select * from public.vault_device_logs
  where vault_id = p_vault_id
  order by last_login desc;
end;
$$;

create or replace function public.get_device_logs_secure(
  p_vault_id uuid,
  p_master_password text
)
returns setof public.vault_device_logs
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.vaults v
    where v.id = p_vault_id
      and v.master_password_hash = crypt(p_master_password, v.master_password_hash)
  ) then
    raise exception 'invalid vault credentials';
  end if;

  return query
  select * from public.vault_device_logs
  where vault_id = p_vault_id
  order by last_login desc;
end;
$$;

-- Add the real Supabase Auth user ID of the trusted administrator:
insert into public.passguard_admins (user_id)
values ('088982d6-56e4-41b5-9a9e-1941aa9e19e7');
revoke all on function public.passguard_recovery_key() from public;
revoke all on function public.admin_reveal_vault(uuid) from public;
revoke all on function public.admin_update_vault_secure(uuid, text, text, text, text, boolean, boolean, jsonb) from public;
grant execute on function public.admin_reveal_vault(uuid) to authenticated;
grant execute on function public.admin_update_vault_secure(uuid, text, text, text, text, boolean, boolean, jsonb) to authenticated;
grant execute on function public.log_device_login_secure(uuid, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_device_logs_secure(uuid, text) to anon, authenticated;

alter table public.vault_device_logs enable row level security;
revoke all on public.vault_device_logs from anon, authenticated;
