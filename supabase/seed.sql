-- ============================================================
-- 第卅者 — Seed Data (Development Only)
-- ============================================================

-- Predefined rooms (always exist)
insert into rooms (room_key, is_active, is_user_created, closes_at) values
  ('room_partner',    true, false, now() + interval '365 days'),
  ('room_lonely',     true, false, now() + interval '365 days'),
  ('room_doubt',      true, false, now() + interval '365 days'),
  ('room_cant_sleep', true, false, now() + interval '365 days'),
  ('room_quiet',      true, false, now() + interval '365 days'),
  ('room_transition', true, false, now() + interval '365 days')
on conflict do nothing;
