-- ============================================================
-- 第卅者 — Migration 005: Auth Integration
--
-- Switch from device_id JWT claim auth to Supabase Anonymous Auth.
-- users.id is now the Supabase auth.uid() (anon user UUID).
-- This replaces the current_device_id() approach.
-- ============================================================

-- Drop old helper (no longer needed)
drop function if exists current_device_id();

-- Recreate users table FK to auth.users
-- (users.id was already uuid PK — now enforce it must match auth.users.id)
alter table users
  add constraint users_auth_fk
  foreign key (id) references auth.users(id) on delete cascade;

-- Remove gen_random_uuid() default — id must be supplied as auth.uid()
alter table users alter column id drop default;

-- ============================================================
-- Drop all old device_id-based RLS policies and replace
-- ============================================================

-- USERS
drop policy if exists "users_select_own"   on users;
drop policy if exists "users_insert_own"   on users;
drop policy if exists "users_update_own"   on users;

create policy "users_select_own" on users
  for select using (id = auth.uid());

create policy "users_insert_own" on users
  for insert with check (id = auth.uid());

create policy "users_update_own" on users
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- WICKS TRANSACTIONS
drop policy if exists "wicks_tx_select_own" on wicks_transactions;
drop policy if exists "wicks_tx_insert_own" on wicks_transactions;

-- Add user_id column alongside device_id for RLS
alter table wicks_transactions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create policy "wicks_tx_select_own" on wicks_transactions
  for select using (user_id = auth.uid());

create policy "wicks_tx_insert_own" on wicks_transactions
  for insert with check (user_id = auth.uid());

-- VIGIL SUBSCRIPTIONS
drop policy if exists "vigil_sub_select_own" on vigil_subscriptions;

alter table vigil_subscriptions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create policy "vigil_sub_select_own" on vigil_subscriptions
  for select using (user_id = auth.uid());

-- MATCH QUEUE
drop policy if exists "match_queue_select_own"  on match_queue;
drop policy if exists "match_queue_insert_own"  on match_queue;
drop policy if exists "match_queue_update_own"  on match_queue;
drop policy if exists "match_queue_delete_own"  on match_queue;

alter table match_queue
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create policy "match_queue_select_own" on match_queue
  for select using (user_id = auth.uid());

create policy "match_queue_insert_own" on match_queue
  for insert with check (user_id = auth.uid());

create policy "match_queue_update_own" on match_queue
  for update using (user_id = auth.uid());

create policy "match_queue_delete_own" on match_queue
  for delete using (user_id = auth.uid());

-- CONVERSATIONS
drop policy if exists "conv_select_participant" on conversations;

alter table conversations
  add column if not exists user_a_id uuid references auth.users(id) on delete cascade,
  add column if not exists user_b_id uuid references auth.users(id) on delete cascade;

create policy "conv_select_participant" on conversations
  for select using (
    user_a_id = auth.uid() or user_b_id = auth.uid()
  );

-- CONVERSATION MESSAGES
drop policy if exists "conv_msg_select_participant" on conversation_messages;
drop policy if exists "conv_msg_insert_own"         on conversation_messages;

alter table conversation_messages
  add column if not exists sender_id uuid references auth.users(id) on delete cascade;

create policy "conv_msg_select_participant" on conversation_messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
      and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

create policy "conv_msg_insert_own" on conversation_messages
  for insert with check (sender_id = auth.uid());

-- ROOM MESSAGES
drop policy if exists "room_msg_insert_own" on room_messages;

alter table room_messages
  add column if not exists sender_id uuid references auth.users(id) on delete cascade;

create policy "room_msg_insert_own" on room_messages
  for insert with check (sender_id = auth.uid());

-- ROOMS
drop policy if exists "rooms_insert_own" on rooms;

alter table rooms
  add column if not exists creator_id uuid references auth.users(id) on delete set null;

create policy "rooms_insert_own" on rooms
  for insert with check (creator_id = auth.uid());

-- PHOTO VEILS
drop policy if exists "photo_veil_select_participant" on photo_veils;
drop policy if exists "photo_veil_insert_own"         on photo_veils;
drop policy if exists "photo_veil_update_receiver"    on photo_veils;

alter table photo_veils
  add column if not exists sender_id   uuid references auth.users(id) on delete cascade,
  add column if not exists receiver_id uuid references auth.users(id) on delete cascade;

create policy "photo_veil_select_participant" on photo_veils
  for select using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "photo_veil_insert_own" on photo_veils
  for insert with check (sender_id = auth.uid());

create policy "photo_veil_update_receiver" on photo_veils
  for update using (receiver_id = auth.uid());

-- LOFT SESSIONS
drop policy if exists "loft_session_insert_own" on loft_sessions;
drop policy if exists "loft_session_update_own" on loft_sessions;

alter table loft_sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create policy "loft_session_insert_own" on loft_sessions
  for insert with check (user_id = auth.uid());

create policy "loft_session_update_own" on loft_sessions
  for update using (user_id = auth.uid());

-- REPORTS
drop policy if exists "reports_insert_own" on reports;
drop policy if exists "reports_select_own" on reports;

alter table reports
  add column if not exists reporter_id uuid references auth.users(id) on delete cascade,
  add column if not exists reported_id uuid references auth.users(id) on delete cascade;

create policy "reports_insert_own" on reports
  for insert with check (reporter_id = auth.uid());

create policy "reports_select_own" on reports
  for select using (reporter_id = auth.uid());

-- ============================================================
-- Update core RPC functions to use auth.uid()
-- ============================================================

create or replace function spend_wicks(
  p_amount    integer,
  p_type      text,
  p_reference text default null,
  p_note      text default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_uid         uuid := auth.uid();
  v_balance     integer;
  v_new_balance integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select wicks into v_balance
  from users where id = v_uid for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if v_balance < p_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient_wicks', 'balance', v_balance);
  end if;

  v_new_balance := v_balance - p_amount;

  update users set wicks = v_new_balance, last_active_at = now() where id = v_uid;

  insert into wicks_transactions (user_id, user_device_id, amount, balance_after, type, reference_id, note)
  select v_uid, device_id, -p_amount, v_new_balance, p_type, p_reference, p_note
  from users where id = v_uid;

  return jsonb_build_object('ok', true, 'balance', v_new_balance);
end;
$$;

create or replace function add_wicks(
  p_amount    integer,
  p_type      text,
  p_reference text default null,
  p_note      text default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_uid         uuid := auth.uid();
  v_new_balance integer;
  v_device_id   text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  update users set wicks = wicks + p_amount, last_active_at = now()
  where id = v_uid
  returning wicks, device_id into v_new_balance, v_device_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  insert into wicks_transactions (user_id, user_device_id, amount, balance_after, type, reference_id, note)
  values (v_uid, v_device_id, p_amount, v_new_balance, p_type, p_reference, p_note);

  return jsonb_build_object('ok', true, 'balance', v_new_balance);
end;
$$;

create or replace function enter_loft(p_night_name text)
returns jsonb language plpgsql security definer as $$
declare
  v_uid        uuid := auth.uid();
  v_result     jsonb;
  v_session_id uuid;
  v_tonight    date := current_date;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if exists (
    select 1 from loft_sessions
    where user_id = v_uid and night_date = v_tonight
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_entered_tonight');
  end if;

  v_result := spend_wicks(5, 'loft_entry', null, '夜閣入場');
  if not (v_result->>'ok')::boolean then return v_result; end if;

  insert into loft_sessions (user_id, user_device_id, night_name, night_date)
  select v_uid, device_id, p_night_name, v_tonight
  from users where id = v_uid
  returning id into v_session_id;

  return jsonb_build_object('ok', true, 'session_id', v_session_id, 'balance', v_result->>'balance');
end;
$$;

create or replace function lift_photo_veil(p_veil_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_uid       uuid := auth.uid();
  v_result    jsonb;
  v_new_level smallint;
begin
  if not exists (select 1 from photo_veils where id = p_veil_id and receiver_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  select lift_level into v_new_level from photo_veils where id = p_veil_id;
  if v_new_level >= 4 then
    return jsonb_build_object('ok', false, 'error', 'already_fully_revealed');
  end if;

  v_result := spend_wicks(2, 'veil_lift', p_veil_id::text, '揭開照片紗罩');
  if not (v_result->>'ok')::boolean then return v_result; end if;

  update photo_veils
  set lift_level = lift_level + 1, wicks_spent = wicks_spent + 2
  where id = p_veil_id
  returning lift_level into v_new_level;

  return jsonb_build_object('ok', true, 'lift_level', v_new_level, 'balance', v_result->>'balance');
end;
$$;
