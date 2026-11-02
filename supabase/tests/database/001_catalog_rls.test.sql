-- RLS, grants and constraints for the catalogue.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Fixtures (as postgres) ----------------------------------------------------
insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-00000000a001', 'owner@test.local', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-00000000b002', 'random@test.local', 'authenticated', 'authenticated');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-00000000a001');

insert into public.categories (id, slug, name, is_active) values
  ('10000000-0000-0000-0000-000000000001', 'test-active', '{"en":"Active"}', true),
  ('10000000-0000-0000-0000-000000000002', 'test-hidden', '{"en":"Hidden"}', false);
insert into public.products (id, slug, name, price_minor, stock, status) values
  ('20000000-0000-0000-0000-000000000001', 'test-live', '{"en":"Live"}', 1000, 5, 'active'),
  ('20000000-0000-0000-0000-000000000002', 'test-draft', '{"en":"Draft"}', 1000, 5, 'draft');
insert into public.personalization_fields (product_id, label, type) values
  ('20000000-0000-0000-0000-000000000001', '{"en":"Name"}', 'text'),
  ('20000000-0000-0000-0000-000000000002', '{"en":"Secret"}', 'text');

-- Anonymous visitor ---------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is((select count(*)::int from public.categories where slug like 'test-%'), 1, 'anon sees only active categories');
select is((select count(*)::int from public.products where slug like 'test-%'), 1, 'anon sees only active products');
select is((select slug from public.products where slug like 'test-%'), 'test-live', 'anon sees the live product');
select is((select count(*)::int from public.personalization_fields f
           join public.products p on p.id = f.product_id where p.slug like 'test-%'), 1,
          'anon sees personalisation fields of active products only');
select throws_ok($$ select count(*) from public.admin_users $$, '42501', null, 'anon has no access to admin_users');
select is((select count(*)::int from public.store_settings), 1, 'anon can read store settings');
select throws_ok($$ insert into public.categories (slug, name) values ('x', '{"en":"X"}') $$, '42501', null, 'anon cannot insert categories');
select throws_ok($$ insert into public.products (slug, name, price_minor) values ('x', '{"en":"X"}', 1) $$, '42501', null, 'anon cannot insert products');
select throws_ok($$ update public.products set price_minor = 1 where slug = 'test-live' $$, '42501', null, 'anon cannot update products');
select throws_ok($$ update public.store_settings set store_name = 'Hacked' $$, '42501', null, 'anon cannot update store settings');
select is(private.is_admin(), false, 'is_admin() is false for anon');

-- Signed-in but NOT an admin ------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000b002","role":"authenticated"}', true);

select is(private.is_admin(), false, 'a signed-in non-admin is not an admin');
select is((select count(*)::int from public.products where slug like 'test-%'), 1, 'non-admin does not see draft products');
select throws_ok($$ insert into public.categories (slug, name) values ('x', '{"en":"X"}') $$, '42501', null, 'non-admin cannot insert categories');
select results_eq($$ with u as (update public.products set price_minor = 1 where slug = 'test-live' returning 1) select count(*)::int from u $$, $$ values (0) $$, 'non-admin cannot update products');
select results_eq($$ with u as (update public.store_settings set store_name = 'Hacked' returning 1) select count(*)::int from u $$, $$ values (0) $$, 'non-admin cannot update store settings');

-- Admin -----------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated"}', true);

select is(private.is_admin(), true, 'owner is an admin');
select is((select count(*)::int from public.products where slug like 'test-%'), 2, 'admin sees drafts');
select lives_ok($$ insert into public.categories (slug, name) values ('test-new', '{"en":"New","mk":"Ново"}') $$, 'admin can insert categories');
select results_eq($$ with u as (update public.products set stock = 9 where slug = 'test-draft' returning 1) select count(*)::int from u $$, $$ values (1) $$, 'admin can update products');

-- Constraints (as admin) -------------------------------------------------------
select throws_ok($$ insert into public.categories (slug, name) values ('test-noen', '{"mk":"Само мк"}') $$, '23514', null, 'English name is required');
select throws_ok($$ insert into public.products (slug, name, price_minor, sale_price_minor) values ('test-sale', '{"en":"S"}', 1000, 1500) $$, '23514', null, 'sale price must be below price');
select throws_ok($$ insert into public.personalization_fields (product_id, label, type) values ('20000000-0000-0000-0000-000000000001', '{"en":"Colour"}', 'select') $$, '23514', null, 'select fields need options');

-- No privileged function is callable by API roles -----------------------------
reset role;
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))),
  0, 'no SECURITY DEFINER function in public is executable by anon/authenticated');

select * from finish();
rollback;
