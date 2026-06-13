-- ============================================================
-- 第卅者 — Migration 003: Functions & Triggers
-- ============================================================

-- ============================================================
-- FUNCTION: spend_wicks
-- Atomically deduct wicks and record the transaction.
-- Call from app via RPC.
-- ============================================================
create or replace function spend_wicks(
  p_device_id  text,
  p_amount     integer,
  p_type       text,
  p_reference  text default null,
  p_note       text default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_balance integer;
  v_new_balance integer;
begin
  -- Lock the user row
  select wicks into v_balance
  from users
  where device_id = p_device_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if v_balance < p_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient_wicks', 'balance', v_balance);
  end if;

  v_new_balance := v_balance - p_amount;

  update users set wicks = v_new_balance, last_active_at = now()
  where device_id = p_device_id;

  insert into wicks_transactions (user_device_id, amount, balance_after, type, reference_id, note)
  values (p_device_id, -p_amount, v_new_balance, p_type, p_reference, p_note);

  return jsonb_build_object('ok', true, 'balance', v_new_balance);
end;
$$;

-- ============================================================
-- FUNCTION: add_wicks
-- Add wicks to a user (purchase or bonus).
-- ============================================================
create or replace function add_wicks(
  p_device_id  text,
  p_amount     integer,
  p_type       text,
  p_reference  text default null,
  p_note       text default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_new_balance integer;
begin
  update users
  set wicks = wicks + p_amount, last_active_at = now()
  where device_id = p_device_id
  returning wicks into v_new_balance;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  insert into wicks_transactions (user_device_id, amount, balance_after, type, reference_id, note)
  values (p_device_id, p_amount, v_new_balance, p_type, p_reference, p_note);

  return jsonb_build_object('ok', true, 'balance', v_new_balance);
end;
$$;

-- ============================================================
-- FUNCTION: enter_loft
-- Deduct 5 wicks and create a loft_session.
-- ============================================================
create or replace function enter_loft(
  p_device_id  text,
  p_night_name text
)
returns jsonb language plpgsql security definer as $$
declare
  v_result jsonb;
  v_session_id uuid;
  v_tonight date := current_date;
begin
  -- Check if already entered tonight
  if exists (
    select 1 from loft_sessions
    where user_device_id = p_device_id and night_date = v_tonight
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_entered_tonight');
  end if;

  -- Deduct wicks
  v_result := spend_wicks(p_device_id, 5, 'loft_entry', null, '夜閣入場');
  if not (v_result->>'ok')::boolean then
    return v_result;
  end if;

  -- Create session
  insert into loft_sessions (user_device_id, night_name, night_date)
  values (p_device_id, p_night_name, v_tonight)
  returning id into v_session_id;

  return jsonb_build_object('ok', true, 'session_id', v_session_id, 'balance', v_result->>'balance');
end;
$$;

-- ============================================================
-- FUNCTION: lift_photo_veil
-- Deduct 2 wicks and increment lift_level on a photo_veil.
-- ============================================================
create or replace function lift_photo_veil(
  p_device_id  text,
  p_veil_id    uuid
)
returns jsonb language plpgsql security definer as $$
declare
  v_result    jsonb;
  v_new_level smallint;
begin
  -- Verify receiver
  if not exists (
    select 1 from photo_veils
    where id = p_veil_id and receiver_device_id = p_device_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  -- Check not fully revealed
  select lift_level into v_new_level from photo_veils where id = p_veil_id;
  if v_new_level >= 4 then
    return jsonb_build_object('ok', false, 'error', 'already_fully_revealed');
  end if;

  -- Deduct wicks
  v_result := spend_wicks(p_device_id, 2, 'veil_lift', p_veil_id::text, '揭開照片紗罩');
  if not (v_result->>'ok')::boolean then
    return v_result;
  end if;

  -- Lift one layer
  update photo_veils
  set lift_level = lift_level + 1, wicks_spent = wicks_spent + 2
  where id = p_veil_id
  returning lift_level into v_new_level;

  return jsonb_build_object('ok', true, 'lift_level', v_new_level, 'balance', v_result->>'balance');
end;
$$;

-- ============================================================
-- FUNCTION: daily_seed_rotation
-- Called by pg_cron at 03:00 daily — rotate all user seeds.
-- ============================================================
create or replace function rotate_daily_seeds()
returns void language plpgsql security definer as $$
begin
  update users
  set seed = encode(
    digest(device_id || current_date::text || 'thirties_salt_v1', 'sha256'),
    'hex'
  );
end;
$$;

-- ============================================================
-- FUNCTION: cleanup_expired_data
-- Called by pg_cron — purge ephemeral data.
-- ============================================================
create or replace function cleanup_expired_data()
returns void language plpgsql security definer as $$
begin
  -- Delete expired room messages
  delete from room_messages where expires_at < now();

  -- Delete expired conversation messages
  delete from conversation_messages where expires_at < now();

  -- Delete expired match queue entries
  delete from match_queue where expires_at < now() and status = 'waiting';

  -- Mark conversations as ended if no messages in 30 min
  update conversations
  set ended_at = now(), ended_reason = 'timeout'
  where ended_at is null
  and started_at < now() - interval '32 minutes';

  -- Close inactive rooms (no messages in 24h)
  update rooms
  set is_active = false
  where is_active = true
  and closes_at < now();
end;
$$;

-- ============================================================
-- TRIGGER: update last_active_at on any user activity
-- ============================================================
create or replace function touch_user_activity()
returns trigger language plpgsql as $$
begin
  update users set last_active_at = now()
  where device_id = new.sender_device_id;
  return new;
end;
$$;

create trigger room_msg_touch_user
  after insert on room_messages
  for each row execute function touch_user_activity();

create trigger conv_msg_touch_user
  after insert on conversation_messages
  for each row execute function touch_user_activity();

-- ============================================================
-- TRIGGER: increment room message_count
-- ============================================================
create or replace function increment_room_message_count()
returns trigger language plpgsql as $$
begin
  update rooms set message_count = message_count + 1 where id = new.room_id;
  return new;
end;
$$;

create trigger room_msg_count_trigger
  after insert on room_messages
  for each row execute function increment_room_message_count();

-- ============================================================
-- TRIGGER: increment conversation message_count
-- ============================================================
create or replace function increment_conv_message_count()
returns trigger language plpgsql as $$
begin
  update conversations set message_count = message_count + 1 where id = new.conversation_id;
  return new;
end;
$$;

create trigger conv_msg_count_trigger
  after insert on conversation_messages
  for each row execute function increment_conv_message_count();

-- ============================================================
-- FUNCTION: ban_user (admin only)
-- ============================================================
create or replace function admin_ban_user(
  p_admin_id     uuid,
  p_device_id    text,
  p_reason       text,
  p_report_id    uuid default null
)
returns jsonb language plpgsql security definer as $$
begin
  -- Verify admin
  if not exists (select 1 from admin_users where id = p_admin_id and is_active = true) then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  update users
  set is_banned = true, ban_reason = p_reason
  where device_id = p_device_id;

  -- Update report if provided
  if p_report_id is not null then
    update reports
    set status = 'actioned',
        reviewed_by = p_admin_id,
        reviewed_at = now(),
        action_taken = 'permanent_ban'
    where id = p_report_id;
  end if;

  -- Audit log
  insert into admin_audit_log (admin_id, action, target_type, target_id, details)
  values (p_admin_id, 'ban_user', 'user', p_device_id,
    jsonb_build_object('reason', p_reason, 'report_id', p_report_id));

  return jsonb_build_object('ok', true);
end;
$$;
