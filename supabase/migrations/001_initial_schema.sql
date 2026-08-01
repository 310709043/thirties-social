-- ============================================================
-- 第卅者 (The Other) — Supabase Schema
-- Migration 001: Initial Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS
-- Anonymous, device-based. No real names, no emails.
-- ============================================================
create table users (
  id                  uuid primary key default gen_random_uuid(),
  device_id           text not null unique,
  seed                text not null,                -- daily identity seed (changes every 03:00)
  lang                text not null default 'zh' check (lang in ('zh', 'en')),
  direction           text not null default 'mist' check (direction in ('mist', 'nocturne', 'ink')),
  wicks               integer not null default 3 check (wicks >= 0),
  vigil               boolean not null default false,
  setup_done          boolean not null default false,
  is_banned           boolean not null default false,
  ban_reason          text,
  -- Setup profile fields (all optional after setup)
  gender              text check (gender in ('female', 'male')),
  age_bracket         text check (age_bracket in ('25-29', '30-34', '35-39', '40-44', '45+')),
  relationship_status text check (relationship_status in ('married', 'longterm', 'separated', 'single', 'complicated')),
  seeking             text[] default '{}',          -- ['listen', 'vent', 'connect', 'loft']
  boundary            text check (boundary in ('talk_only', 'loft_ok', 'photo_ok')),
  region              text,
  quote               text,
  loft_visible        boolean not null default true,
  night_color_idx     smallint not null default 0,
  night_adj_idx       smallint not null default 0,
  created_at          timestamptz not null default now(),
  last_active_at      timestamptz not null default now()
);

create index users_device_id_idx on users(device_id);
create index users_last_active_idx on users(last_active_at desc);
create index users_vigil_idx on users(vigil) where vigil = true;

-- ============================================================
-- WICKS TRANSACTIONS — economy ledger
-- ============================================================
create table wicks_transactions (
  id               uuid primary key default gen_random_uuid(),
  user_device_id   text not null references users(device_id) on delete cascade,
  amount           integer not null,               -- positive = gain, negative = spend
  balance_after    integer not null,
  type             text not null check (type in (
    'purchase',       -- bought a pack
    'loft_entry',     -- entered the Loft (-5)
    'pulse',          -- sent a pulse message (-1)
    'gift',           -- sent a candle gift (-5)
    'photo_veil',     -- sent a veiled photo (-2)
    'veil_lift',      -- lifted a photo veil (-2)
    'refund',         -- admin refund
    'bonus'           -- admin bonus / promo
  )),
  reference_id     text,                           -- related entity id if any
  note             text,
  created_at       timestamptz not null default now()
);

create index wicks_tx_user_idx on wicks_transactions(user_device_id, created_at desc);

-- ============================================================
-- VIGIL SUBSCRIPTIONS
-- ============================================================
create table vigil_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_device_id   text not null references users(device_id) on delete cascade,
  started_at       timestamptz not null default now(),
  ends_at          timestamptz not null,
  is_active        boolean not null default true,
  payment_ref      text,                           -- payment gateway reference
  amount_twd       integer,                        -- NT$ paid
  created_at       timestamptz not null default now()
);

create index vigil_sub_user_idx on vigil_subscriptions(user_device_id);
create index vigil_sub_active_idx on vigil_subscriptions(is_active, ends_at) where is_active = true;

-- ============================================================
-- ROOMS — public topic rooms (the Park)
-- ============================================================
create table rooms (
  id                  uuid primary key default gen_random_uuid(),
  creator_device_id   text references users(device_id) on delete set null,
  room_key            text,                        -- predefined key (room_partner, room_lonely…)
  custom_topic_zh     text,                        -- user-created topic in Chinese
  custom_topic_en     text,                        -- user-created topic in English
  is_active           boolean not null default true,
  is_user_created     boolean not null default false,
  message_count       integer not null default 0,
  created_at          timestamptz not null default now(),
  closes_at           timestamptz not null default (now() + interval '24 hours')
);

create index rooms_active_idx on rooms(is_active, created_at desc) where is_active = true;
create index rooms_key_idx on rooms(room_key) where room_key is not null;

-- ============================================================
-- ROOM MESSAGES — ephemeral, visible in the room feed
-- ============================================================
create table room_messages (
  id               uuid primary key default gen_random_uuid(),
  room_id          uuid not null references rooms(id) on delete cascade,
  sender_device_id text not null references users(device_id) on delete cascade,
  sender_seed      text not null,
  content          text not null check (char_length(content) <= 280),
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '3 hours')
);

create index room_msg_room_idx on room_messages(room_id, created_at desc);

-- ============================================================
-- MATCH QUEUE — waiting to be paired
-- ============================================================
create table match_queue (
  id               uuid primary key default gen_random_uuid(),
  user_device_id   text not null unique references users(device_id) on delete cascade,
  mood_text        text,
  room_id          uuid references rooms(id) on delete cascade,
  gender_pref      text[],
  status           text not null default 'waiting' check (status in ('waiting', 'matched', 'expired')),
  entered_at       timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '30 minutes')
);

create index match_queue_waiting_idx on match_queue(status, entered_at) where status = 'waiting';

-- ============================================================
-- CONVERSATIONS — private 1-on-1 chat sessions
-- ============================================================
create table conversations (
  id               uuid primary key default gen_random_uuid(),
  user_a_device_id text not null references users(device_id) on delete cascade,
  user_b_device_id text not null references users(device_id) on delete cascade,
  room_id          uuid references rooms(id) on delete set null,
  duration_seconds integer,
  message_count    integer not null default 0,
  ended_reason     text check (ended_reason in ('timeout', 'user_left', 'blocked', 'admin')),
  is_reported      boolean not null default false,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz
);

create index conv_user_a_idx on conversations(user_a_device_id, started_at desc);
create index conv_user_b_idx on conversations(user_b_device_id, started_at desc);
create index conv_reported_idx on conversations(is_reported) where is_reported = true;

-- ============================================================
-- CONVERSATION MESSAGES — ephemeral, auto-deleted after session
-- ============================================================
create table conversation_messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid not null references conversations(id) on delete cascade,
  sender_device_id    text not null references users(device_id) on delete cascade,
  content             text not null check (char_length(content) <= 500),
  message_type        text not null default 'text' check (message_type in ('text', 'photo_veil', 'pulse', 'gift', 'system')),
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null default (now() + interval '30 minutes')
);

create index conv_msg_conv_idx on conversation_messages(conversation_id, created_at asc);

-- ============================================================
-- PHOTO VEILS — veiled photos sent in conversations
-- ============================================================
create table photo_veils (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references conversations(id) on delete cascade,
  sender_device_id text not null references users(device_id) on delete cascade,
  receiver_device_id text not null references users(device_id) on delete cascade,
  storage_path     text not null,                  -- Supabase Storage path (private bucket)
  lift_level       smallint not null default 0 check (lift_level between 0 and 4),
  wicks_spent      integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- LOFT SESSIONS — nightly Loft entries (midnight window)
-- ============================================================
create table loft_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_device_id   text not null references users(device_id) on delete cascade,
  night_name       text not null,                  -- composed color+adj name
  wicks_spent      integer not null default 5,
  entered_at       timestamptz not null default now(),
  left_at          timestamptz,
  night_date       date not null default current_date  -- for dedup (one entry per night)
);

create unique index loft_session_unique_night on loft_sessions(user_device_id, night_date);
create index loft_session_date_idx on loft_sessions(night_date desc);

-- ============================================================
-- LOFT CONVERSATIONS — 1-on-1 inside the Loft (58 min window)
-- ============================================================
create table loft_conversations (
  id                  uuid primary key default gen_random_uuid(),
  loft_session_a_id   uuid not null references loft_sessions(id) on delete cascade,
  loft_session_b_id   uuid not null references loft_sessions(id) on delete cascade,
  veil_lifts          integer not null default 0,
  pulses_sent         integer not null default 0,
  gifts_sent          integer not null default 0,
  total_wicks_spent   integer not null default 0,
  is_reported         boolean not null default false,
  started_at          timestamptz not null default now(),
  ended_at            timestamptz
);

-- ============================================================
-- REPORTS — safety reports
-- ============================================================
create table reports (
  id                    uuid primary key default gen_random_uuid(),
  reporter_device_id    text not null references users(device_id) on delete cascade,
  reported_device_id    text not null references users(device_id) on delete cascade,
  conversation_id       uuid references conversations(id) on delete set null,
  loft_conversation_id  uuid references loft_conversations(id) on delete set null,
  report_type           text not null check (report_type in (
    'harassment', 'inappropriate_content', 'spam', 'solicitation', 'other'
  )),
  description           text,
  status                text not null default 'pending' check (status in (
    'pending', 'reviewing', 'actioned', 'dismissed'
  )),
  reviewed_by           uuid,                      -- FK to admin_users.id (added after)
  reviewed_at           timestamptz,
  action_taken          text check (action_taken in (
    'warning', 'temp_ban_3d', 'temp_ban_7d', 'permanent_ban', 'no_action'
  )),
  admin_note            text,
  created_at            timestamptz not null default now()
);

create index reports_status_idx on reports(status, created_at desc);
create index reports_reported_idx on reports(reported_device_id);

-- ============================================================
-- ADMIN USERS — staff with backend access
-- ============================================================
create table admin_users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  name          text not null,
  role          text not null default 'moderator' check (role in ('super_admin', 'moderator', 'viewer')),
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);

-- Add FK from reports to admin_users now that table exists
alter table reports
  add constraint reports_reviewed_by_fkey
  foreign key (reviewed_by) references admin_users(id) on delete set null;

-- ============================================================
-- ADMIN AUDIT LOG — record every admin action
-- ============================================================
create table admin_audit_log (
  id            uuid primary key default gen_random_uuid(),
  admin_id      uuid not null references admin_users(id) on delete cascade,
  action        text not null,                     -- 'ban_user', 'close_room', 'dismiss_report' etc.
  target_type   text not null,                     -- 'user', 'room', 'report', 'conversation'
  target_id     text not null,
  details       jsonb,
  created_at    timestamptz not null default now()
);

create index audit_admin_idx on admin_audit_log(admin_id, created_at desc);
create index audit_target_idx on admin_audit_log(target_type, target_id);
