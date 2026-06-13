-- ============================================================
-- 第卅者 — Migration 004: Admin Views
-- Views for the Next.js admin panel to query efficiently.
-- All views are accessible only to admin users.
-- ============================================================

-- ============================================================
-- VIEW: admin_dashboard_stats
-- Real-time summary numbers for the dashboard.
-- ============================================================
create or replace view admin_dashboard_stats as
select
  -- Users
  (select count(*) from users)                                              as total_users,
  (select count(*) from users where created_at > now() - interval '24h')   as new_users_24h,
  (select count(*) from users where last_active_at > now() - interval '24h') as dau,
  (select count(*) from users where last_active_at > now() - interval '7d')  as wau,
  (select count(*) from users where vigil = true)                           as vigil_subscribers,
  (select count(*) from users where is_banned = true)                       as banned_users,
  -- Conversations
  (select count(*) from conversations)                                      as total_conversations,
  (select count(*) from conversations where started_at > now() - interval '24h') as conv_24h,
  (select count(*) from conversations where ended_at is null)               as active_conversations,
  -- Loft
  (select count(*) from loft_sessions where night_date = current_date)      as loft_entries_tonight,
  (select count(*) from loft_sessions where entered_at > now() - interval '24h') as loft_24h,
  -- Reports
  (select count(*) from reports where status = 'pending')                   as pending_reports,
  (select count(*) from reports where created_at > now() - interval '24h')  as reports_24h,
  -- Economy
  (select coalesce(sum(amount), 0) from wicks_transactions where type = 'purchase' and created_at > now() - interval '24h') as wicks_purchased_24h,
  (select coalesce(sum(amount), 0) from wicks_transactions where type = 'purchase' and created_at > now() - interval '30d') as wicks_purchased_30d,
  -- Rooms
  (select count(*) from rooms where is_active = true)                       as active_rooms;

-- ============================================================
-- VIEW: admin_user_list
-- Paginated user list for admin panel.
-- ============================================================
create or replace view admin_user_list as
select
  u.id,
  u.device_id,
  u.seed,
  u.lang,
  u.direction,
  u.wicks,
  u.vigil,
  u.gender,
  u.age_bracket,
  u.relationship_status,
  u.is_banned,
  u.ban_reason,
  u.setup_done,
  u.created_at,
  u.last_active_at,
  -- Aggregate stats
  (select count(*) from conversations c
   where c.user_a_device_id = u.device_id or c.user_b_device_id = u.device_id) as total_conversations,
  (select count(*) from reports r where r.reported_device_id = u.device_id)     as times_reported,
  (select count(*) from reports r where r.reporter_device_id = u.device_id)     as reports_filed,
  (select count(*) from loft_sessions s where s.user_device_id = u.device_id)   as loft_entries,
  (select coalesce(sum(amount), 0) from wicks_transactions t
   where t.user_device_id = u.device_id and t.type = 'purchase')                as total_wicks_purchased
from users u;

-- ============================================================
-- VIEW: admin_report_queue
-- Pending reports with context for moderators.
-- ============================================================
create or replace view admin_report_queue as
select
  r.id,
  r.reporter_device_id,
  r.reported_device_id,
  r.report_type,
  r.description,
  r.status,
  r.created_at,
  r.reviewed_at,
  r.action_taken,
  r.admin_note,
  -- Reporter info
  reporter.seed as reporter_seed,
  reporter.vigil as reporter_vigil,
  -- Reported user info
  reported.seed as reported_seed,
  reported.is_banned as reported_is_banned,
  reported.vigil as reported_vigil,
  -- Previous reports against this user
  (select count(*) from reports prev
   where prev.reported_device_id = r.reported_device_id
   and prev.id != r.id) as previous_reports_count,
  -- Reviewing admin
  a.name as reviewed_by_name,
  -- Conversation context
  r.conversation_id,
  r.loft_conversation_id
from reports r
left join users reporter on reporter.device_id = r.reporter_device_id
left join users reported on reported.device_id = r.reported_device_id
left join admin_users a on a.id = r.reviewed_by
order by
  case r.status when 'pending' then 0 when 'reviewing' then 1 else 2 end,
  r.created_at desc;

-- ============================================================
-- VIEW: admin_room_list
-- Active and recent rooms.
-- ============================================================
create or replace view admin_room_list as
select
  r.id,
  r.room_key,
  r.custom_topic_zh,
  r.custom_topic_en,
  r.is_active,
  r.is_user_created,
  r.message_count,
  r.created_at,
  r.closes_at,
  -- Creator info
  r.creator_device_id,
  u.seed as creator_seed,
  -- Recent activity
  (select max(m.created_at) from room_messages m where m.room_id = r.id) as last_message_at,
  (select count(distinct m.sender_device_id) from room_messages m where m.room_id = r.id) as unique_senders
from rooms r
left join users u on u.device_id = r.creator_device_id
order by r.is_active desc, r.created_at desc;

-- ============================================================
-- VIEW: admin_economy_overview
-- Daily wicks economy summary.
-- ============================================================
create or replace view admin_economy_overview as
select
  date_trunc('day', created_at) as day,
  type,
  count(*) as transaction_count,
  sum(amount) as total_amount,
  count(distinct user_device_id) as unique_users
from wicks_transactions
group by 1, 2
order by 1 desc, 2;

-- ============================================================
-- VIEW: admin_loft_overview
-- Nightly Loft stats.
-- ============================================================
create or replace view admin_loft_overview as
select
  s.night_date,
  count(s.id) as entries,
  count(lc.id) as conversations_started,
  coalesce(sum(lc.veil_lifts), 0) as total_veil_lifts,
  coalesce(sum(lc.pulses_sent), 0) as total_pulses,
  coalesce(sum(lc.gifts_sent), 0) as total_gifts,
  coalesce(sum(lc.total_wicks_spent), 0) as total_wicks_spent
from loft_sessions s
left join loft_conversations lc
  on lc.loft_session_a_id = s.id or lc.loft_session_b_id = s.id
group by s.night_date
order by s.night_date desc;

-- ============================================================
-- VIEW: admin_conversation_list
-- Recent conversations for moderation review.
-- ============================================================
create or replace view admin_conversation_list as
select
  c.id,
  c.user_a_device_id,
  c.user_b_device_id,
  ua.seed as user_a_seed,
  ub.seed as user_b_seed,
  c.message_count,
  c.duration_seconds,
  c.ended_reason,
  c.is_reported,
  c.started_at,
  c.ended_at,
  -- Room context
  c.room_id,
  r.room_key,
  r.custom_topic_zh
from conversations c
left join users ua on ua.device_id = c.user_a_device_id
left join users ub on ub.device_id = c.user_b_device_id
left join rooms r on r.id = c.room_id
order by c.started_at desc;
