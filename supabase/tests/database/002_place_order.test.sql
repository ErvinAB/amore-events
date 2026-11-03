-- place_order / cancel_order: authority, validation, snapshots, stock, abuse.
begin;
create extension if not exists pgtap with schema extensions;
select plan(50);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------------------
update public.store_settings set delivery_fee_minor = 15000, free_delivery_threshold_minor = 300000, currency_code = 'MKD';

insert into public.products (id, slug, name, price_minor, sale_price_minor, stock, status, sku) values
  ('a0000000-0000-0000-0000-000000000001', 't-necklace', '{"en":"T Necklace","mk":"Т ѓердан"}', 100000, null, 5, 'active', 'T-NEC'),
  ('a0000000-0000-0000-0000-000000000002', 't-draft',    '{"en":"T Draft"}',    50000, null, 5, 'draft', null),
  ('a0000000-0000-0000-0000-000000000003', 't-archived', '{"en":"T Archived"}', 50000, null, 5, 'archived', null),
  ('a0000000-0000-0000-0000-000000000004', 't-sale',     '{"en":"T Sale"}',     80000, 60000, 1, 'active', null),
  ('a0000000-0000-0000-0000-000000000005', 't-plain',    '{"en":"T Plain"}',    10000, null, 100, 'active', null);

insert into public.personalization_fields (id, product_id, label, type, required, max_length, options, sort_order) values
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '{"en":"Name"}', 'text', true, 5, null, 0),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '{"en":"Colour"}', 'select', true, null,
     '[{"value":"gold","label":{"en":"Gold","mk":"Злато"}},{"value":"silver","label":{"en":"Silver"}}]', 1),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '{"en":"Date"}', 'date', false, null, null, 2);

insert into public.product_images (product_id, storage_path, sort_order) values
  ('a0000000-0000-0000-0000-000000000001', 'products/a0000000-0000-0000-0000-000000000001/b0000000-0000-0000-0000-000000000001.webp', 0);

-- Helpers
create function pg_temp.cust(phone text) returns jsonb language sql as $$
  select jsonb_build_object('first_name','Ana','last_name','Petrovska','phone',phone,'phone_normalized',phone,
    'email','ana@example.test','street_address','Ul. Makedonija 1','city','Skopje','postal_code','1000',
    'delivery_notes','Ring twice','order_notes','Gift wrap please')
$$;
create function pg_temp.necklace(name text, colour text, qty int default 1) returns jsonb language sql as $$
  select jsonb_build_object('product_id','a0000000-0000-0000-0000-000000000001','quantity',qty,
    'personalization', jsonb_build_object('f0000000-0000-0000-0000-000000000001', name, 'f0000000-0000-0000-0000-000000000002', colour))
$$;
create function pg_temp.plain(qty int) returns jsonb language sql as $$
  select jsonb_build_object('product_id','a0000000-0000-0000-0000-000000000005','quantity',qty,'personalization','{}'::jsonb)
$$;
grant execute on all functions in schema pg_temp to service_role, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
select is(has_function_privilege('anon', 'public.place_order(jsonb,jsonb,text,text)', 'execute'), false, 'anon cannot execute place_order');
select is(has_function_privilege('authenticated', 'public.place_order(jsonb,jsonb,text,text)', 'execute'), false, 'authenticated cannot execute place_order');
select is(has_function_privilege('service_role', 'public.place_order(jsonb,jsonb,text,text)', 'execute'), true, 'service_role can execute place_order');
select is(has_function_privilege('anon', 'public.register_checkout_attempt(text,integer)', 'execute'), false, 'anon cannot execute register_checkout_attempt');
select is(has_function_privilege('anon', 'public.cancel_order(uuid)', 'execute'), false, 'anon cannot execute cancel_order');
select is(has_table_privilege('anon', 'public.orders', 'select'), false, 'anon has no SELECT on orders');
select is(has_table_privilege('anon', 'public.order_items', 'select'), false, 'anon has no SELECT on order_items');
select is(has_table_privilege('anon', 'public.checkout_attempts', 'select'), false, 'anon has no SELECT on checkout_attempts');
select is(has_table_privilege('authenticated', 'public.orders', 'insert'), false, 'authenticated cannot INSERT orders directly');

set local role anon;
select throws_ok($$ select public.place_order(pg_temp.cust('+38970111111'), jsonb_build_array(pg_temp.plain(1)), 'en', null) $$,
  '42501', null, 'anon calling place_order is denied');
reset role;

-- ---------------------------------------------------------------------------
-- Successful order (as service_role) — tampered browser price is ignored
-- ---------------------------------------------------------------------------
set local role service_role;
create temporary table r1 as
  select public.place_order(
    pg_temp.cust('+38970100001'),
    jsonb_build_array(pg_temp.necklace('Ana', 'gold') || '{"unit_price_minor": 1, "price_minor": 1, "name": "hacked"}'::jsonb),
    'mk', repeat('a', 64)) as r;
reset role;

select matches((select r ->> 'order_number' from r1), '^ORD-\d{4}-\d{6}$', 'order number is human friendly');
select is((select (r ->> 'subtotal_minor')::int from r1), 100000, 'subtotal uses the database price, not the browser price');
select is((select (r ->> 'delivery_fee_minor')::int from r1), 15000, 'delivery fee from store settings');
select is((select (r ->> 'total_minor')::int from r1), 115000, 'total = subtotal + delivery');
select is((select (r ->> 'duplicate')::boolean from r1), false, 'first submission is not a duplicate');
select results_eq(
  $$ select status::text, payment_method::text, payment_status::text, locale, currency_code from public.orders where id = (select (r->>'order_id')::uuid from r1) $$,
  $$ values ('new', 'cash_on_delivery', 'unpaid', 'mk', 'MKD') $$,
  'new COD order: status new, unpaid, locale and currency recorded');
select results_eq(
  $$ select product_name ->> 'en', sku, unit_price_minor, quantity, line_total_minor, image_path is not null from public.order_items where order_id = (select (r->>'order_id')::uuid from r1) $$,
  $$ values ('T Necklace', 'T-NEC', 100000, 1, 100000, true) $$,
  'order item snapshot: name, sku, price, quantity, image');
select is(
  (select personalization from public.order_items where order_id = (select (r->>'order_id')::uuid from r1)),
  '[{"field_id":"f0000000-0000-0000-0000-000000000001","label":{"en":"Name"},"type":"text","value":"Ana","value_label":null},
    {"field_id":"f0000000-0000-0000-0000-000000000002","label":{"en":"Colour"},"type":"select","value":"gold","value_label":{"en":"Gold","mk":"Злато"}}]'::jsonb,
  'personalisation snapshot stores labels and chosen values');
select is((select stock from public.products where slug = 't-necklace'), 4, 'stock decremented by quantity');

-- Snapshots survive later product changes
update public.products set price_minor = 999999, name = '{"en":"Renamed"}' where slug = 't-necklace';
select results_eq(
  $$ select product_name ->> 'en', unit_price_minor from public.order_items where order_id = (select (r->>'order_id')::uuid from r1) $$,
  $$ values ('T Necklace', 100000) $$,
  'old order keeps purchase-time name and price after the product changes');
select throws_ok($$ update public.order_items set unit_price_minor = 1 $$, '42501', null, 'order items cannot be modified');

-- Changed database price wins for new orders
set local role service_role;
create temporary table r2 as
  select public.place_order(pg_temp.cust('+38970100002'), jsonb_build_array(pg_temp.necklace('Bo', 'silver')), 'en', null) as r;
reset role;
select is((select (r ->> 'subtotal_minor')::int from r2), 999999, 'current database price is used for new orders');
select is((select (r ->> 'delivery_fee_minor')::int from r2), 0, 'free delivery above the threshold');
select isnt((select r ->> 'order_number' from r1), (select r ->> 'order_number' from r2), 'order numbers are unique');

-- Sale price is charged
set local role service_role;
select is((public.place_order(pg_temp.cust('+38970100003'),
  jsonb_build_array(jsonb_build_object('product_id','a0000000-0000-0000-0000-000000000004','quantity',1)), 'en', null) ->> 'subtotal_minor')::int,
  60000, 'sale price is charged when set');

-- ---------------------------------------------------------------------------
-- Rejections
-- ---------------------------------------------------------------------------
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100004'), jsonb_build_array(jsonb_build_object('product_id','a0000000-0000-0000-0000-000000000002','quantity',1)), 'en', null) $$,
  'P0001', 'PRODUCT_UNAVAILABLE', 'draft (inactive) product rejected');
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100004'), jsonb_build_array(jsonb_build_object('product_id','a0000000-0000-0000-0000-000000000003','quantity',1)), 'en', null) $$,
  'P0001', 'PRODUCT_UNAVAILABLE', 'archived product rejected');
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100004'), jsonb_build_array(jsonb_build_object('product_id','a0000000-0000-0000-0000-0000000000ff','quantity',1)), 'en', null) $$,
  'P0001', 'PRODUCT_UNAVAILABLE', 'nonexistent product rejected');
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100004'), jsonb_build_array(jsonb_build_object('product_id','not-a-uuid','quantity',1)), 'en', null) $$,
  'P0001', 'INVALID_REQUEST', 'malformed product id rejected');
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100004'), jsonb_build_array(pg_temp.plain(0)), 'en', null) $$,
  'P0001', 'INVALID_REQUEST', 'zero quantity rejected');
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100004'), '[]'::jsonb, 'en', null) $$,
  'P0001', 'EMPTY_CART', 'empty cart rejected');
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100004'), jsonb_build_array(pg_temp.necklace('Ana','gold', 4), pg_temp.necklace('Bo','gold', 1)), 'en', null) $$,
  'P0001', 'OUT_OF_STOCK', 'stock is checked across lines of the same product');
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100004'), jsonb_build_array(jsonb_build_object('product_id','a0000000-0000-0000-0000-000000000001','quantity',1,'personalization',jsonb_build_object('f0000000-0000-0000-0000-000000000002','gold'))), 'en', null) $$,
  'P0001', 'PERSONALIZATION_REQUIRED', 'missing required personalisation rejected');
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100004'), jsonb_build_array(pg_temp.necklace('Ana','platinum')), 'en', null) $$,
  'P0001', 'INVALID_PERSONALIZATION', 'select value not offered is rejected');
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100004'), jsonb_build_array(pg_temp.necklace('Anastasija','gold')), 'en', null) $$,
  'P0001', 'PERSONALIZATION_TOO_LONG', 'text max length enforced');
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100004'), jsonb_build_array(pg_temp.necklace('Ana','gold') || '{"personalization":{"f0000000-0000-0000-0000-000000000001":"Ana","f0000000-0000-0000-0000-000000000002":"gold","f0000000-0000-0000-0000-0000000000ff":"x"}}'::jsonb), 'en', null) $$,
  'P0001', 'INVALID_PERSONALIZATION', 'unknown personalisation field rejected');
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100004'), jsonb_build_array(pg_temp.necklace('Ana','gold') || '{"personalization":{"f0000000-0000-0000-0000-000000000001":{"x":1},"f0000000-0000-0000-0000-000000000002":"gold"}}'::jsonb), 'en', null) $$,
  'P0001', 'INVALID_PERSONALIZATION', 'non-string personalisation value rejected');
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100004'), jsonb_build_array(pg_temp.necklace('Ana','gold') || '{"personalization":{"f0000000-0000-0000-0000-000000000001":"Ana","f0000000-0000-0000-0000-000000000002":"gold","f0000000-0000-0000-0000-000000000003":"2026-02-30"}}'::jsonb), 'en', null) $$,
  'P0001', 'INVALID_PERSONALIZATION', 'impossible date rejected');

-- Rollback: a valid line followed by a failing line leaves nothing behind
select results_eq($$ select stock from public.products where slug = 't-plain' $$, $$ values (100) $$, 'plain stock before failing order');
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100005'), jsonb_build_array(pg_temp.plain(2), pg_temp.necklace('Ana','gold', 10)), 'en', null) $$,
  'P0001', 'OUT_OF_STOCK', 'order with one failing line is rejected');
select results_eq($$ select stock from public.products where slug = 't-plain' $$, $$ values (100) $$, 'no stock taken for the valid line (full rollback)');
select is((select count(*)::int from public.orders where phone_normalized = '+38970100005'), 0, 'no partial order row left behind');

-- Same product, different engraving → two lines
create temporary table r3 as
  select public.place_order(pg_temp.cust('+38970100006'), jsonb_build_array(pg_temp.necklace('Ana','gold'), pg_temp.necklace('Bo','gold')), 'en', null) as r;
select is((select count(*)::int from public.order_items where order_id = (select (r->>'order_id')::uuid from r3)), 2, 'different engraving → separate order items');

-- ---------------------------------------------------------------------------
-- Duplicate detection and rate limits
-- ---------------------------------------------------------------------------
create temporary table d1 as select public.place_order(pg_temp.cust('+38970100007'), jsonb_build_array(pg_temp.plain(1)), 'en', null) as r;
create temporary table d2 as select public.place_order(pg_temp.cust('+38970100007'), jsonb_build_array(pg_temp.plain(1)), 'en', null) as r;
select is((select r ->> 'order_number' from d2), (select r ->> 'order_number' from d1), 'identical resubmission returns the same order');
select is((select (r ->> 'duplicate')::boolean from d2), true, 'resubmission is flagged as duplicate');
select is((select count(*)::int from public.orders where phone_normalized = '+38970100007'), 1, 'no second order row for a duplicate');

-- Phone limit: 5 distinct orders per 24h, 6th refused
select public.place_order(pg_temp.cust('+38970100008'), jsonb_build_array(pg_temp.plain(n)), 'en', null) from generate_series(1, 5) n;
select throws_ok($$ select public.place_order(pg_temp.cust('+38970100008'), jsonb_build_array(pg_temp.plain(6)), 'en', null) $$,
  'P0001', 'RATE_LIMITED', 'sixth order from the same phone within 24h is refused');

-- IP limit: a shared IP (CGNAT/household) allows many different people, refuses after 30/hour
select public.place_order(pg_temp.cust('+389702000' || lpad(n::text, 2, '0')), jsonb_build_array(pg_temp.plain(1)), 'en', repeat('b', 64)) from generate_series(0, 29) n;
select throws_ok($$ select public.place_order(pg_temp.cust('+38970300000'), jsonb_build_array(pg_temp.plain(1)), 'en', repeat('b', 64)) $$,
  'P0001', 'RATE_LIMITED', '31st order from one IP within an hour is refused (30 different people were fine)');

-- ---------------------------------------------------------------------------
-- Cancellation restores stock exactly once
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select public.cancel_order((select (r->>'order_id')::uuid from r3));
select public.cancel_order((select (r->>'order_id')::uuid from r3));
reset role;
select results_eq($$ select status::text, payment_status::text, stock_restored_at is not null from public.orders where id = (select (r->>'order_id')::uuid from r3) $$,
  $$ values ('cancelled', 'cancelled', true) $$, 'cancelled order is marked and restock recorded');
-- t-necklace: 5 → 4 (r1) → 3 (r2) → 1 (r3, two items) → 3 after one restore (not 5)
select is((select stock from public.products where slug = 't-necklace'), 3, 'cancelling twice restores stock only once');

select * from finish();
rollback;
