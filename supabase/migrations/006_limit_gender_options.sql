-- Retire profile values that are no longer offered by the product.
-- Unknown values become unconfigured so nobody is assigned a pricing journey.
update users
set gender = null,
    setup_done = false
where gender is not null
  and gender not in ('female', 'male');

alter table users drop constraint if exists users_gender_check;
alter table users
  add constraint users_gender_check
  check (gender is null or gender in ('female', 'male'));
