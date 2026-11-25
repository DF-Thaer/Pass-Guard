-- Run after SECURE_RECOVERY_MIGRATION.sql and SECURE_SESSIONS_AND_PASSKEYS.sql.

create table if not exists public.passguard_reserved_vault_identifiers (
  identifier text primary key,
  vault_id uuid not null references public.vaults(id) on delete cascade,
  reserved_at timestamptz not null default now()
);

insert into public.passguard_reserved_vault_identifiers (identifier, vault_id)
select lower(trim(identifier)), id
from public.vaults
where nullif(trim(identifier), '') is not null
on conflict (identifier) do nothing;

create index if not exists passguard_vault_identifier_normalized_idx
  on public.vaults (lower(trim(identifier)));
create index if not exists passguard_vault_email_normalized_idx
  on public.vaults (lower(trim(coalesce(email, ''))));

alter table public.passguard_reserved_vault_identifiers enable row level security;
revoke all on public.passguard_reserved_vault_identifiers from anon, authenticated;

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
declare
  v_identifier text := lower(trim(p_identifier));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_vault public.vaults%rowtype;
begin
  perform pg_advisory_xact_lock(724014113);

  if v_identifier = '' or v_identifier = 'admin' or p_master_password is null or p_master_password = '' then
    return;
  end if;

  if exists (
    select 1 from public.vaults
    where lower(trim(identifier)) = v_identifier
      or lower(trim(coalesce(email, ''))) = v_identifier
  ) or exists (
    select 1 from public.passguard_reserved_vault_identifiers
    where identifier = v_identifier
  ) then
    return;
  end if;

  if v_email <> '' and exists (
    select 1 from public.vaults
    where lower(trim(identifier)) = v_email or lower(trim(email)) = v_email
  ) then
    return;
  end if;

  if v_email <> '' and v_email <> v_identifier and exists (
    select 1 from public.passguard_reserved_vault_identifiers
    where identifier = v_email
  ) then
    return;
  end if;

  insert into public.vaults (
    identifier, email, phone, is_locked, alert,
    master_password_hash, recovery_password_encrypted, encrypted_data
  ) values (
    v_identifier, v_email, p_phone, false, false,
    crypt(p_master_password, gen_salt('bf', 12)),
    encode(pgp_sym_encrypt(p_master_password, public.passguard_recovery_key()), 'base64'),
    p_encrypted_data
  )
  returning * into v_vault;

  insert into public.passguard_reserved_vault_identifiers (identifier, vault_id)
  values (v_identifier, v_vault.id);

  return next v_vault;
end;
$$;

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
  v_identifier text := lower(trim(p_identifier));
  v_vault public.vaults%rowtype;
  v_email_count integer;
  v_session_token text;
  v_session_id uuid;
begin
  if p_master_password is null or p_master_password = '' then
    return null;
  end if;

  select * into v_vault
  from public.vaults v
  where lower(trim(v.identifier)) = v_identifier
  for update;

  if found then
    if v_vault.master_password_hash is null
      or v_vault.master_password_hash <> crypt(p_master_password, v_vault.master_password_hash) then
      return null;
    end if;
  else
    select count(*) into v_email_count
    from public.vaults v
    where lower(trim(coalesce(v.email, ''))) = v_identifier;

    if v_email_count <> 1 then
      return null;
    end if;

    select * into v_vault
    from public.vaults v
    where lower(trim(coalesce(v.email, ''))) = v_identifier
    for update;

    if not found or v_vault.master_password_hash is null
      or v_vault.master_password_hash <> crypt(p_master_password, v_vault.master_password_hash) then
      return null;
    end if;
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
  v_identifier text := lower(trim(p_new_identifier));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_vault public.vaults%rowtype;
begin
  if p_old_master_password is null or p_old_master_password = ''
    or p_new_master_password is null or p_new_master_password = '' then
    return;
  end if;

  if not public.passguard_session_is_valid(p_vault_id, p_session_token) then
    raise exception 'vault session revoked or expired';
  end if;

  perform pg_advisory_xact_lock(724014113);

  select * into v_vault from public.vaults where id = p_vault_id for update;
  if not found or v_vault.master_password_hash is null
    or v_vault.master_password_hash <> crypt(p_old_master_password, v_vault.master_password_hash) then
    return;
  end if;

  if v_identifier = '' or v_identifier = 'admin' then
    raise exception 'invalid vault identifier';
  end if;

  if exists (
    select 1 from public.passguard_reserved_vault_identifiers
    where identifier = v_identifier and vault_id <> p_vault_id
  ) then
    raise exception 'vault identifier is unavailable';
  end if;

  if exists (
    select 1 from public.vaults
    where id <> p_vault_id and lower(trim(coalesce(email, ''))) = v_identifier
  ) then
    raise exception 'vault identifier is unavailable';
  end if;

  if v_email <> '' and exists (
    select 1 from public.vaults
    where id <> p_vault_id
      and (
        lower(trim(identifier)) = v_email
        or lower(trim(coalesce(email, ''))) = v_email
      )
  ) then
    raise exception 'alternate sign-in email is already in use';
  end if;

  if v_email <> '' and v_email <> v_identifier and exists (
    select 1 from public.passguard_reserved_vault_identifiers
    where identifier = v_email
  ) then
    raise exception 'alternate sign-in email conflicts with a current or previous username';
  end if;

  update public.vaults
  set identifier = v_identifier,
      email = v_email,
      phone = p_phone,
      encrypted_data = p_encrypted_data,
      master_password_hash = crypt(p_new_master_password, gen_salt('bf', 12)),
      recovery_password_encrypted = encode(pgp_sym_encrypt(p_new_master_password, public.passguard_recovery_key()), 'base64'),
      updated_at = now()
  where id = p_vault_id
  returning * into v_vault;

  if not exists (
    select 1 from public.passguard_reserved_vault_identifiers
    where identifier = v_identifier and vault_id = p_vault_id
  ) then
    insert into public.passguard_reserved_vault_identifiers (identifier, vault_id)
    values (v_identifier, p_vault_id);
  end if;

  update public.passguard_vault_sessions
  set revoked_at = now()
  where vault_id = p_vault_id
    and token_hash <> public.passguard_hash_token(p_session_token)
    and revoked_at is null;

  return next v_vault;
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
  v_identifier text := lower(trim(p_identifier));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_vault public.vaults%rowtype;
begin
  if not exists (select 1 from public.passguard_admins where user_id = auth.uid()) then
    raise exception 'admin access required';
  end if;

  if p_master_password is null or p_master_password = '' then
    raise exception 'master password is required';
  end if;

  perform pg_advisory_xact_lock(724014113);

  select * into v_vault from public.vaults where id = p_vault_id for update;
  if not found then
    return;
  end if;

  if v_identifier = '' or v_identifier = 'admin' then
    raise exception 'invalid vault identifier';
  end if;

  if exists (
    select 1 from public.passguard_reserved_vault_identifiers
    where identifier = v_identifier and vault_id <> p_vault_id
  ) then
    raise exception 'vault identifier is unavailable';
  end if;

  if exists (
    select 1 from public.vaults
    where id <> p_vault_id and lower(trim(coalesce(email, ''))) = v_identifier
  ) then
    raise exception 'vault identifier is unavailable';
  end if;

  if v_email <> '' and exists (
    select 1 from public.vaults
    where id <> p_vault_id
      and (
        lower(trim(identifier)) = v_email
        or lower(trim(coalesce(email, ''))) = v_email
      )
  ) then
    raise exception 'alternate sign-in email is already in use';
  end if;

  if v_email <> '' and v_email <> v_identifier and exists (
    select 1 from public.passguard_reserved_vault_identifiers
    where identifier = v_email
  ) then
    raise exception 'alternate sign-in email conflicts with a current or previous username';
  end if;

  update public.vaults
  set identifier = v_identifier,
      email = v_email,
      phone = p_phone,
      is_locked = p_is_locked,
      alert = p_alert,
      encrypted_data = p_encrypted_data,
      master_password_hash = crypt(p_master_password, gen_salt('bf', 12)),
      recovery_password_encrypted = encode(pgp_sym_encrypt(p_master_password, public.passguard_recovery_key()), 'base64'),
      updated_at = now()
  where id = p_vault_id
  returning * into v_vault;

  if not exists (
    select 1 from public.passguard_reserved_vault_identifiers
    where identifier = v_identifier and vault_id = p_vault_id
  ) then
    insert into public.passguard_reserved_vault_identifiers (identifier, vault_id)
    values (v_identifier, p_vault_id);
  end if;

  update public.passguard_vault_sessions
  set revoked_at = now()
  where vault_id = p_vault_id and revoked_at is null;

  return next v_vault;
end;
$$;

create table if not exists public.passguard_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  content text not null check (length(trim(content)) between 1 and 1200),
  display_style text not null default 'ticker' check (display_style in ('ticker', 'card')),
  placement text not null default 'banner' check (placement in ('banner', 'sidebar')),
  target_vault_id uuid references public.vaults(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists passguard_announcements_active_idx
  on public.passguard_announcements(is_active, created_at desc);
create index if not exists passguard_announcements_target_idx
  on public.passguard_announcements(target_vault_id);

alter table public.passguard_announcements enable row level security;
revoke all on public.passguard_announcements from anon, authenticated;
grant select, insert, update, delete on public.passguard_announcements to authenticated;

create or replace function public.passguard_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.passguard_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.passguard_is_admin() from public, anon;
grant execute on function public.passguard_is_admin() to authenticated;

drop policy if exists passguard_announcements_admin_manage on public.passguard_announcements;
create policy passguard_announcements_admin_manage
  on public.passguard_announcements
  for all
  to authenticated
  using (public.passguard_is_admin())
  with check (public.passguard_is_admin());

create or replace function public.get_public_passguard_announcements()
returns table (id uuid, title text, content text, display_style text, placement text, is_active boolean)
language sql
security definer
set search_path = public
stable
as $$
  select a.id, a.title, a.content, a.display_style, a.placement, a.is_active
  from public.passguard_announcements a
  where a.is_active
    and a.target_vault_id is null
  order by a.created_at desc;
$$;

create or replace function public.get_vault_passguard_announcements(p_session_token text)
returns table (id uuid, title text, content text, display_style text, placement text, is_active boolean)
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

  if v_vault_id is null or not public.passguard_session_is_valid(v_vault_id, p_session_token) then
    raise exception 'vault session revoked or expired';
  end if;

  return query
  select a.id, a.title, a.content, a.display_style, a.placement, a.is_active
  from public.passguard_announcements a
  where a.is_active
    and a.target_vault_id = v_vault_id
  order by a.created_at desc;
end;
$$;

revoke all on function public.get_public_passguard_announcements() from public;
revoke all on function public.get_vault_passguard_announcements(text) from public;
grant execute on function public.get_public_passguard_announcements() to anon, authenticated;
grant execute on function public.get_vault_passguard_announcements(text) to anon, authenticated;

revoke all on function public.register_vault_secure(text, text, text, text, jsonb) from public;
revoke all on function public.open_vault_session_secure(text, text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.update_vault_profile_secure(uuid, text, text, text, text, text, text, jsonb) from public;
revoke all on function public.admin_update_vault_secure(uuid, text, text, text, text, boolean, boolean, jsonb) from public;
grant execute on function public.register_vault_secure(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.open_vault_session_secure(text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_vault_profile_secure(uuid, text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_update_vault_secure(uuid, text, text, text, text, boolean, boolean, jsonb) to authenticated;

notify pgrst, 'reload schema';
