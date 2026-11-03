-- =============================================================================
-- Orders and Cash-on-Delivery checkout (V0.2)
--
-- * orders / order_items: no public access at all. Admins read/update via RLS.
--   Inserts happen ONLY inside public.place_order().
-- * place_order(): SECURITY INVOKER (no privilege escalation needed). EXECUTE
--   is granted to service_role ONLY. The browser never calls it; the checkout
--   Server Action does, with the server-only secret key.
-- * One transaction: lock products in id order, validate everything against
--   the database, compute prices/totals, insert order + immutable item
--   snapshots, decrement stock. Any error rolls back everything.
-- * Anti-abuse (duplicate orders, per-phone and per-IP limits) is enforced in
--   the same transaction so it cannot be raced.
-- =============================================================================

create type public.order_status as enum
  ('new', 'confirmed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled');
create type public.payment_status as enum ('unpaid', 'paid', 'cancelled');
create type public.payment_method as enum ('cash_on_delivery');

-- Human-friendly numbers (ORD-2026-000142). A sequence is concurrency-safe;
-- gaps (rolled-back transactions) are acceptable and expected.
create sequence public.order_number_seq as bigint start 1;
revoke all on sequence public.order_number_seq from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique check (order_number ~ '^ORD-\d{4}-\d{6,}$'),
  status public.order_status not null default 'new',
  payment_method public.payment_method not null default 'cash_on_delivery',
  payment_status public.payment_status not null default 'unpaid',
  locale text not null check (locale in ('en', 'mk', 'sq')),

  first_name text not null check (length(btrim(first_name)) between 1 and 80),
  last_name text not null check (length(btrim(last_name)) between 1 and 80),
  phone text not null check (length(phone) between 6 and 40),
  phone_normalized text not null check (phone_normalized ~ '^\+[1-9]\d{6,14}$'),
  email text check (email is null or (length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  street_address text not null check (length(btrim(street_address)) between 3 and 300),
  city text not null check (length(btrim(city)) between 1 and 100),
  postal_code text check (postal_code is null or length(postal_code) <= 20),
  delivery_notes text check (delivery_notes is null or length(delivery_notes) <= 1000),
  order_notes text check (order_notes is null or length(order_notes) <= 1000),

  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  subtotal_minor integer not null check (subtotal_minor >= 0),
  delivery_fee_minor integer not null check (delivery_fee_minor >= 0),
  total_minor integer not null check (total_minor = subtotal_minor + delivery_fee_minor),

  -- Anti-abuse bookkeeping (no raw IPs stored; HMAC computed server-side).
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  cart_fingerprint text not null,

  stock_restored_at timestamptz,   -- idempotent restock guard (V0.3 cancel)
  owner_notified_at timestamptz,   -- set when the owner notification succeeds
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;

create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_phone_recent_idx on public.orders (phone_normalized, created_at desc);
create index orders_ip_recent_idx on public.orders (ip_hash, created_at desc) where ip_hash is not null;

create trigger orders_updated_at
  before update on public.orders
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Order items: immutable snapshots of what was bought, at the price paid.
-- -----------------------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- RESTRICT: a product that has been ordered can never be hard-deleted.
  product_id uuid references public.products (id) on delete restrict,
  product_name jsonb not null check (private.is_localized_text(product_name, true)),
  product_slug text not null,
  sku text,
  variant_label text,
  image_path text,
  unit_price_minor integer not null check (unit_price_minor >= 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total_minor integer not null check (line_total_minor = unit_price_minor * quantity),
  -- [{field_id, label{en,mk,sq}, type, value, value_label{...}|null}]
  personalization jsonb not null default '[]'::jsonb check (jsonb_typeof(personalization) = 'array'),
  created_at timestamptz not null default now()
);
alter table public.order_items enable row level security;

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

-- Snapshots must not change after the order is placed.
create function private.prevent_order_item_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'order items are immutable snapshots' using errcode = '42501';
end;
$$;
create trigger order_items_immutable
  before update on public.order_items
  for each row execute function private.prevent_order_item_changes();

-- -----------------------------------------------------------------------------
-- Checkout attempts (per-IP throttle of submissions, incl. failed ones).
-- Service role only; no API policies, no grants.
-- -----------------------------------------------------------------------------
create table public.checkout_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.checkout_attempts enable row level security;
create index checkout_attempts_ip_recent_idx on public.checkout_attempts (ip_hash, created_at desc);

-- -----------------------------------------------------------------------------
-- RLS: admins only. No anon policies => anon sees nothing.
-- -----------------------------------------------------------------------------
create policy "admins read orders" on public.orders for select
  to authenticated using ((select private.is_admin()));
create policy "admins update orders" on public.orders for update
  to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins read order items" on public.order_items for select
  to authenticated using ((select private.is_admin()));

revoke all on public.orders, public.order_items, public.checkout_attempts from public, anon, authenticated;
grant select on public.orders, public.order_items to authenticated;
-- Admins may change workflow fields only (V0.3 UI). Customer data and totals are not updatable.
grant update (status, payment_status) on public.orders to authenticated;
grant all on public.orders, public.order_items, public.checkout_attempts to service_role;
grant usage on sequence public.order_number_seq to service_role;

-- -----------------------------------------------------------------------------
-- Personalisation validation against the CURRENT field configuration.
-- Mirrors src/lib/personalization/validate.ts (defaults: text 60, textarea 300,
-- hard max 500). Returns the snapshot array in field order.
-- -----------------------------------------------------------------------------
create function private.validated_personalization(p_product_id uuid, p_values jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  f record;
  v text;
  v_max integer;
  v_label jsonb;
  v_out jsonb := '[]'::jsonb;
  v_known integer;
begin
  if p_values is null then p_values := '{}'::jsonb; end if;
  if jsonb_typeof(p_values) <> 'object' then
    raise exception 'INVALID_PERSONALIZATION' using detail = p_product_id::text;
  end if;

  -- Unknown field ids (stale or tampered input) are rejected.
  select count(*) into v_known
  from jsonb_object_keys(p_values) k
  where not exists (
    select 1 from public.personalization_fields pf
    where pf.product_id = p_product_id and pf.id::text = k
  );
  if v_known > 0 then
    raise exception 'INVALID_PERSONALIZATION' using detail = p_product_id::text;
  end if;

  for f in
    select pf.id, pf.label, pf.type, pf.required, pf.max_length, pf.options
    from public.personalization_fields pf
    where pf.product_id = p_product_id
    order by pf.sort_order, pf.created_at
  loop
    if p_values ? f.id::text then
      if jsonb_typeof(p_values -> f.id::text) <> 'string' then
        raise exception 'INVALID_PERSONALIZATION' using detail = p_product_id::text;
      end if;
      v := btrim(p_values ->> f.id::text);
    else
      v := '';
    end if;

    if v = '' then
      if f.required then
        raise exception 'PERSONALIZATION_REQUIRED' using detail = p_product_id::text;
      end if;
      continue;
    end if;

    if v ~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]' then
      raise exception 'INVALID_PERSONALIZATION' using detail = p_product_id::text;
    end if;

    v_label := null;
    case f.type
      when 'text', 'textarea' then
        v_max := least(coalesce(f.max_length, case f.type when 'text' then 60 else 300 end), 500);
        if char_length(v) > v_max then
          raise exception 'PERSONALIZATION_TOO_LONG' using detail = p_product_id::text;
        end if;
        if f.type = 'text' and v ~ '[\r\n]' then
          raise exception 'INVALID_PERSONALIZATION' using detail = p_product_id::text;
        end if;
      when 'select' then
        select o -> 'label' into v_label
        from jsonb_array_elements(f.options) o
        where o ->> 'value' = v;
        if v_label is null then
          raise exception 'INVALID_PERSONALIZATION' using detail = p_product_id::text;
        end if;
      when 'date' then
        if v !~ '^\d{4}-\d{2}-\d{2}$' or to_char(to_date(v, 'YYYY-MM-DD'), 'YYYY-MM-DD') <> v
           or substr(v, 1, 4)::int not between 1900 and 2100 then
          raise exception 'INVALID_PERSONALIZATION' using detail = p_product_id::text;
        end if;
    end case;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'field_id', f.id, 'label', f.label, 'type', f.type, 'value', v, 'value_label', v_label
    ));
  end loop;

  return v_out;
exception
  when invalid_datetime_format or datetime_field_overflow then
    raise exception 'INVALID_PERSONALIZATION' using detail = p_product_id::text;
end;
$$;

-- -----------------------------------------------------------------------------
-- Per-IP submission throttle (counts every checkout attempt, valid or not).
-- Generous on purpose: families, workplaces and mobile carriers (CGNAT) share IPs.
-- -----------------------------------------------------------------------------
create function public.register_checkout_attempt(p_ip_hash text, p_limit integer default 120)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_REQUEST';
  end if;
  -- Opportunistic cleanup of old rows.
  delete from public.checkout_attempts where created_at < now() - interval '7 days';
  insert into public.checkout_attempts (ip_hash) values (p_ip_hash);
  select count(*) into v_count
  from public.checkout_attempts
  where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
  return v_count <= p_limit;
end;
$$;

-- -----------------------------------------------------------------------------
-- place_order: the single authoritative order-creation path.
--
-- p_customer: {first_name,last_name,phone,phone_normalized,email,street_address,
--              city,postal_code,delivery_notes,order_notes}
-- p_lines:    [{product_id, quantity, personalization:{field_id:value}}]
--             Anything else on a line (e.g. a "price") is ignored.
-- Returns:    {order_id, order_number, subtotal_minor, delivery_fee_minor,
--              total_minor, currency_code, duplicate}
-- Errors (message = code, detail = product id where relevant):
--   INVALID_REQUEST, EMPTY_CART, PRODUCT_UNAVAILABLE, OUT_OF_STOCK,
--   INVALID_PERSONALIZATION, PERSONALIZATION_REQUIRED, PERSONALIZATION_TOO_LONG,
--   RATE_LIMITED
-- -----------------------------------------------------------------------------
create function public.place_order(
  p_customer jsonb,
  p_lines jsonb,
  p_locale text,
  p_ip_hash text default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  c_max_lines constant integer := 50;
  c_phone_daily_limit constant integer := 5;   -- non-cancelled orders per phone per 24h
  -- Per-IP limit is deliberately high: mobile carriers use carrier-grade NAT,
  -- so many unrelated customers can share one public IP. The per-phone limit
  -- is the meaningful guard.
  c_ip_hourly_limit constant integer := 30;    -- orders per IP per hour
  c_duplicate_window constant interval := interval '10 minutes';

  v_settings public.store_settings%rowtype;
  v_phone text;
  v_fingerprint text;
  v_existing public.orders%rowtype;
  v_line jsonb;
  v_qty integer;
  v_product public.products%rowtype;
  v_unit integer;
  v_subtotal integer := 0;
  v_delivery integer;
  v_order_id uuid;
  v_order_number text;
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_personalization jsonb;
  v_image text;
  v_count integer;
begin
  -- ---- Shape checks (defence in depth; the Server Action validates first) ----
  if p_customer is null or jsonb_typeof(p_customer) <> 'object'
     or p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or p_locale is null or p_locale not in ('en', 'mk', 'sq') then
    raise exception 'INVALID_REQUEST';
  end if;
  if jsonb_array_length(p_lines) = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if jsonb_array_length(p_lines) > c_max_lines then
    raise exception 'INVALID_REQUEST';
  end if;

  v_phone := p_customer ->> 'phone_normalized';
  if v_phone is null or v_phone !~ '^\+[1-9]\d{6,14}$' then
    raise exception 'INVALID_REQUEST';
  end if;

  -- Normalised line set: product, quantity, personalisation only. Browser-sent
  -- prices or names are never read.
  create temporary table if not exists pg_temp.order_lines (
    idx integer, product_id uuid, quantity integer, personalization jsonb
  ) on commit drop;
  truncate pg_temp.order_lines;

  begin
    insert into pg_temp.order_lines (idx, product_id, quantity, personalization)
    select l.ord::int, (l.value ->> 'product_id')::uuid, (l.value ->> 'quantity')::int,
           coalesce(l.value -> 'personalization', '{}'::jsonb)
    from jsonb_array_elements(p_lines) with ordinality l(value, ord);
  exception when others then
    raise exception 'INVALID_REQUEST';
  end;

  if exists (select 1 from pg_temp.order_lines where product_id is null or quantity is null or quantity not between 1 and 20) then
    raise exception 'INVALID_REQUEST';
  end if;

  -- Stable fingerprint of the cart for duplicate detection.
  select md5(string_agg(product_id::text || ':' || quantity || ':' || personalization::text, '|'
                        order by product_id, personalization::text, quantity))
  into v_fingerprint
  from pg_temp.order_lines;

  -- ---- Serialise orders from the same phone (prevents double-submit races) ----
  perform pg_advisory_xact_lock(hashtext('place_order:' || v_phone));

  -- Duplicate: same phone + same cart within the window → return that order.
  select * into v_existing
  from public.orders o
  where o.phone_normalized = v_phone
    and o.cart_fingerprint = v_fingerprint
    and o.status <> 'cancelled'
    and o.created_at > now() - c_duplicate_window
  order by o.created_at desc
  limit 1;
  if found then
    return jsonb_build_object(
      'order_id', v_existing.id, 'order_number', v_existing.order_number,
      'subtotal_minor', v_existing.subtotal_minor, 'delivery_fee_minor', v_existing.delivery_fee_minor,
      'total_minor', v_existing.total_minor, 'currency_code', v_existing.currency_code, 'duplicate', true
    );
  end if;

  select count(*) into v_count from public.orders o
  where o.phone_normalized = v_phone and o.status <> 'cancelled' and o.created_at > now() - interval '24 hours';
  if v_count >= c_phone_daily_limit then
    raise exception 'RATE_LIMITED';
  end if;
  if p_ip_hash is not null then
    select count(*) into v_count from public.orders o
    where o.ip_hash = p_ip_hash and o.created_at > now() - interval '1 hour';
    if v_count >= c_ip_hourly_limit then
      raise exception 'RATE_LIMITED';
    end if;
  end if;

  -- ---- Lock every referenced product in a consistent (id) order ----
  perform 1 from public.products p
  where p.id in (select distinct product_id from pg_temp.order_lines)
  order by p.id
  for update;

  -- ---- Availability and stock (aggregate quantity per product) ----
  for v_line in
    select jsonb_build_object('product_id', product_id, 'qty', sum(quantity))
    from pg_temp.order_lines group by product_id order by product_id
  loop
    select * into v_product from public.products p where p.id = (v_line ->> 'product_id')::uuid;
    if not found or v_product.status <> 'active' then
      raise exception 'PRODUCT_UNAVAILABLE' using detail = v_line ->> 'product_id';
    end if;
    if v_product.stock < (v_line ->> 'qty')::int then
      raise exception 'OUT_OF_STOCK' using detail = v_line ->> 'product_id';
    end if;
  end loop;

  -- ---- Price each line from the database and validate personalisation ----
  for v_line in select to_jsonb(ol) from pg_temp.order_lines ol order by ol.idx loop
    select * into v_product from public.products p where p.id = (v_line ->> 'product_id')::uuid;
    v_qty := (v_line ->> 'quantity')::int;
    v_unit := coalesce(v_product.sale_price_minor, v_product.price_minor);
    v_personalization := private.validated_personalization(v_product.id, v_line -> 'personalization');
    select pi.storage_path into v_image from public.product_images pi
    where pi.product_id = v_product.id order by pi.sort_order, pi.created_at limit 1;

    v_subtotal := v_subtotal + v_unit * v_qty;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id, 'product_name', v_product.name, 'product_slug', v_product.slug,
      'sku', v_product.sku, 'image_path', v_image, 'unit_price_minor', v_unit,
      'quantity', v_qty, 'personalization', v_personalization
    ));
  end loop;

  -- ---- Delivery fee from server configuration ----
  select * into v_settings from public.store_settings where id;
  v_delivery := case
    when v_settings.free_delivery_threshold_minor is not null and v_subtotal >= v_settings.free_delivery_threshold_minor then 0
    else v_settings.delivery_fee_minor
  end;

  -- ---- Create the order ----
  v_order_number := 'ORD-' || to_char(now() at time zone 'Europe/Skopje', 'YYYY') || '-'
                    || lpad(nextval('public.order_number_seq')::text, 6, '0');

  insert into public.orders (
    order_number, locale, first_name, last_name, phone, phone_normalized, email,
    street_address, city, postal_code, delivery_notes, order_notes,
    currency_code, subtotal_minor, delivery_fee_minor, total_minor, ip_hash, cart_fingerprint
  ) values (
    v_order_number, p_locale,
    btrim(p_customer ->> 'first_name'), btrim(p_customer ->> 'last_name'),
    btrim(p_customer ->> 'phone'), v_phone,
    nullif(btrim(coalesce(p_customer ->> 'email', '')), ''),
    btrim(p_customer ->> 'street_address'), btrim(p_customer ->> 'city'),
    nullif(btrim(coalesce(p_customer ->> 'postal_code', '')), ''),
    nullif(btrim(coalesce(p_customer ->> 'delivery_notes', '')), ''),
    nullif(btrim(coalesce(p_customer ->> 'order_notes', '')), ''),
    v_settings.currency_code, v_subtotal, v_delivery, v_subtotal + v_delivery, p_ip_hash, v_fingerprint
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(v_items) loop
    insert into public.order_items (
      order_id, product_id, product_name, product_slug, sku, image_path,
      unit_price_minor, quantity, line_total_minor, personalization
    ) values (
      v_order_id, (v_item ->> 'product_id')::uuid, v_item -> 'product_name', v_item ->> 'product_slug',
      v_item ->> 'sku', v_item ->> 'image_path', (v_item ->> 'unit_price_minor')::int,
      (v_item ->> 'quantity')::int,
      (v_item ->> 'unit_price_minor')::int * (v_item ->> 'quantity')::int,
      v_item -> 'personalization'
    );
  end loop;

  -- ---- Decrement stock (rows are locked; checks above guarantee >= 0) ----
  update public.products p
  set stock = p.stock - agg.qty
  from (select product_id, sum(quantity)::int as qty from pg_temp.order_lines group by product_id) agg
  where p.id = agg.product_id;

  return jsonb_build_object(
    'order_id', v_order_id, 'order_number', v_order_number,
    'subtotal_minor', v_subtotal, 'delivery_fee_minor', v_delivery,
    'total_minor', v_subtotal + v_delivery, 'currency_code', v_settings.currency_code, 'duplicate', false
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Cancellation stock restore (used by the V0.3 admin UI). Idempotent: stock is
-- restored only by the statement that flips stock_restored_at from NULL, so a
-- second cancel restores nothing.
-- SECURITY DEFINER because admins must not get a column grant on
-- stock_restored_at. Guarded by an explicit caller check; empty search_path;
-- fully qualified names; EXECUTE granted explicitly below.
-- -----------------------------------------------------------------------------
create function public.cancel_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restored integer := 0;
  v_status public.order_status;
begin
  if not ((select private.is_admin()) or coalesce((select auth.jwt()) ->> 'role', '') = 'service_role') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select o.status into v_status from public.orders o where o.id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_status = 'delivered' then raise exception 'CANNOT_CANCEL_DELIVERED'; end if;

  update public.orders o set status = 'cancelled', payment_status = 'cancelled'
  where o.id = p_order_id;

  with flipped as (
    update public.orders o set stock_restored_at = now()
    where o.id = p_order_id and o.stock_restored_at is null
    returning o.id
  )
  update public.products p
  set stock = p.stock + agg.qty
  from (
    select oi.product_id, sum(oi.quantity)::int as qty
    from public.order_items oi
    where oi.order_id in (select id from flipped) and oi.product_id is not null
    group by oi.product_id
  ) agg
  where p.id = agg.product_id;

  get diagnostics v_restored = row_count;
  return jsonb_build_object('order_id', p_order_id, 'stock_restored', v_restored > 0);
end;
$$;

-- -----------------------------------------------------------------------------
-- Function privileges (explicit). Postgres grants EXECUTE to PUBLIC by default.
-- -----------------------------------------------------------------------------
revoke execute on function public.place_order(jsonb, jsonb, text, text) from public, anon, authenticated;
revoke execute on function public.register_checkout_attempt(text, integer) from public, anon, authenticated;
revoke execute on function public.cancel_order(uuid) from public, anon, authenticated;
revoke execute on function private.validated_personalization(uuid, jsonb) from public, anon, authenticated;
revoke execute on function private.prevent_order_item_changes() from public, anon, authenticated;

grant execute on function public.place_order(jsonb, jsonb, text, text) to service_role;
grant execute on function public.register_checkout_attempt(text, integer) to service_role;
grant execute on function private.validated_personalization(uuid, jsonb) to service_role;
grant execute on function public.cancel_order(uuid) to service_role;
-- V0.3: grant execute on public.cancel_order to authenticated when the admin UI lands.
