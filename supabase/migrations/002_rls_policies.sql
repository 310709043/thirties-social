-- ============================================================
-- 第卅者 — Migration 002: Row Level Security Policies
-- App users authenticate via device_id JWT claim.
-- Admin users authenticate via Supabase Auth (email).
-- ============================================================

-- Enable RLS on all tables
alter table users                enable row level security;
alter table wicks_transactions   enable row level security;
alter table vigil_subscriptions  enable row level security;
alter table rooms                enable row level security;
alter table room_messages        enable row level security;
alter table match_queue          enable row level security;
alter table conversations        enable row level security;
alter table conversation_messages enable row level security;
alter table photo_veils          enable row level security;
alter table loft_sessions        enable row level security;
alter table loft_conversations   enable row level security;
alter table reports              enable row level security;
alter table admin_users          enable row level security;
alter table admin_audit_log      enable row level security;

-- ============================================================
-- Helper: check if current user is admin
-- ============================================================
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from admin_users
    where id = auth.uid()
    and is_active = true
  );
$$;

create or replace function is_super_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from admin_users
    where id = auth.uid()
    and role = 'super_admin'
    and is_active = true
  );
$$;

-- Helper: get device_id from JWT claims (app users use anon key + custom claim)
create or replace function current_device_id()
returns text language sql security definer as $$
  select nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'device_id',
    ''
  );
$$;

-- ============================================================
-- USERS policies
-- ============================================================
-- App: users can read/update only their own row
create policy "users_select_own" on users
  for select using (device_id = current_device_id());

create policy "users_insert_own" on users
  for insert with check (device_id = current_device_id());

create policy "users_update_own" on users
  for update using (device_id = current_device_id())
  with check (device_id = current_device_id());

-- Admin: full access
create policy "admin_users_all" on users
  for all using (is_admin());

-- ============================================================
-- WICKS TRANSACTIONS policies
-- ============================================================
create policy "wicks_tx_select_own" on wicks_transactions
  for select using (user_device_id = current_device_id());

create policy "wicks_tx_insert_own" on wicks_transactions
  for insert with check (user_device_id = current_device_id());

create policy "admin_wicks_tx_all" on wicks_transactions
  for all using (is_admin());

-- ============================================================
-- VIGIL SUBSCRIPTIONS policies
-- ============================================================
create policy "vigil_sub_select_own" on vigil_subscriptions
  for select using (user_device_id = current_device_id());

create policy "admin_vigil_sub_all" on vigil_subscriptions
  for all using (is_admin());

-- ============================================================
-- ROOMS policies
-- ============================================================
-- Anyone can read active rooms
create policy "rooms_select_active" on rooms
  for select using (is_active = true);

-- Authenticated app users can create rooms
create policy "rooms_insert_own" on rooms
  for insert with check (creator_device_id = current_device_id());

-- Admin: full access
create policy "admin_rooms_all" on rooms
  for all using (is_admin());

-- ============================================================
-- ROOM MESSAGES policies
-- ============================================================
create policy "room_msg_select_active" on room_messages
  for select using (expires_at > now());

create policy "room_msg_insert_own" on room_messages
  for insert with check (sender_device_id = current_device_id());

create policy "admin_room_msg_all" on room_messages
  for all using (is_admin());

-- ============================================================
-- MATCH QUEUE policies
-- ============================================================
create policy "match_queue_select_own" on match_queue
  for select using (user_device_id = current_device_id());

create policy "match_queue_insert_own" on match_queue
  for insert with check (user_device_id = current_device_id());

create policy "match_queue_update_own" on match_queue
  for update using (user_device_id = current_device_id());

create policy "match_queue_delete_own" on match_queue
  for delete using (user_device_id = current_device_id());

create policy "admin_match_queue_all" on match_queue
  for all using (is_admin());

-- ============================================================
-- CONVERSATIONS policies
-- ============================================================
create policy "conv_select_participant" on conversations
  for select using (
    user_a_device_id = current_device_id() or
    user_b_device_id = current_device_id()
  );

create policy "admin_conv_all" on conversations
  for all using (is_admin());

-- ============================================================
-- CONVERSATION MESSAGES policies
-- ============================================================
-- Only conversation participants can read messages
create policy "conv_msg_select_participant" on conversation_messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
      and (c.user_a_device_id = current_device_id() or c.user_b_device_id = current_device_id())
    )
  );

create policy "conv_msg_insert_own" on conversation_messages
  for insert with check (sender_device_id = current_device_id());

create policy "admin_conv_msg_all" on conversation_messages
  for all using (is_admin());

-- ============================================================
-- PHOTO VEILS policies
-- ============================================================
create policy "photo_veil_select_participant" on photo_veils
  for select using (
    sender_device_id = current_device_id() or
    receiver_device_id = current_device_id()
  );

create policy "photo_veil_insert_own" on photo_veils
  for insert with check (sender_device_id = current_device_id());

create policy "photo_veil_update_receiver" on photo_veils
  for update using (receiver_device_id = current_device_id());

create policy "admin_photo_veil_all" on photo_veils
  for all using (is_admin());

-- ============================================================
-- LOFT SESSIONS policies
-- ============================================================
-- Users can see all active loft sessions (to find others in the Loft)
create policy "loft_session_select_all" on loft_sessions
  for select using (
    left_at is null or
    user_device_id = current_device_id()
  );

create policy "loft_session_insert_own" on loft_sessions
  for insert with check (user_device_id = current_device_id());

create policy "loft_session_update_own" on loft_sessions
  for update using (user_device_id = current_device_id());

create policy "admin_loft_session_all" on loft_sessions
  for all using (is_admin());

-- ============================================================
-- LOFT CONVERSATIONS policies
-- ============================================================
create policy "loft_conv_select_participant" on loft_conversations
  for select using (
    exists (
      select 1 from loft_sessions s
      where (s.id = loft_session_a_id or s.id = loft_session_b_id)
      and s.user_device_id = current_device_id()
    )
  );

create policy "admin_loft_conv_all" on loft_conversations
  for all using (is_admin());

-- ============================================================
-- REPORTS policies
-- ============================================================
create policy "reports_insert_own" on reports
  for insert with check (reporter_device_id = current_device_id());

create policy "reports_select_own" on reports
  for select using (reporter_device_id = current_device_id());

create policy "admin_reports_all" on reports
  for all using (is_admin());

-- ============================================================
-- ADMIN USERS policies
-- ============================================================
-- Admins can see all admin users; only super_admin can modify
create policy "admin_users_select" on admin_users
  for select using (is_admin());

create policy "admin_users_all" on admin_users
  for all using (is_super_admin());

-- ============================================================
-- ADMIN AUDIT LOG policies
-- ============================================================
create policy "audit_log_select" on admin_audit_log
  for select using (is_admin());

create policy "audit_log_insert" on admin_audit_log
  for insert with check (admin_id = auth.uid() and is_admin());
