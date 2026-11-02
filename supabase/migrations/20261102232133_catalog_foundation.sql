-- =============================================================================
-- Catalog foundation: store settings, admin authorisation, categories,
-- products, product images, personalisation fields.
--
-- Security model (see docs/PROJECT_PLAN.md §4):
--   * RLS enabled on every table in this migration.
--   * Table privileges granted explicitly per role (new Supabase projects do
--     not expose public tables to the Data API automatically).
--   * Every function: EXECUTE revoked from PUBLIC, granted only where needed.
--   * SECURITY DEFINER only for private.is_admin(), with empty search_path.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Private schema for helpers that must not be exposed through the Data API.
-- -----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.personalization_field_type as enum ('text', 'textarea', 'select', 'date');

-- -----------------------------------------------------------------------------
-- Validation helpers (immutable, used in CHECK constraints)
-- -----------------------------------------------------------------------------

-- Translatable text: {"en": "...", "mk": "...", "sq": "..."}.
-- Only known locale keys, string values, English required when `required`.
create function private.is_localized_text(v jsonb, required boolean)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when v is null then not required
    when jsonb_typeof(v) <> 'object' then false
    else
      not exists (
        select 1 from jsonb_each(v) e
        where e.key not in ('en', 'mk', 'sq')
           or jsonb_typeof(e.value) <> 'string'
           or length(e.value #>> '{}') > 5000
      )
      and (not required or length(btrim(coalesce(v ->> 'en', ''))) > 0)
  end;
$$;

-- Select options: [{"value": "gold", "label": {"en": "Gold", ...}}, ...]
-- Non-empty, at most 50, unique slug-like values, English label required.
create function private.is_valid_select_options(v jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    v is not null
    and jsonb_typeof(v) = 'array'
    and jsonb_array_length(v) between 1 and 50
    and not exists (
      select 1 from jsonb_array_elements(v) o
      where jsonb_typeof(o) <> 'object'
         or jsonb_typeof(o -> 'value') <> 'string'
         or (o ->> 'value') !~ '^[a-z0-9][a-z0-9_-]{0,39}$'
         or not private.is_localized_text(o -> 'label', true)
    )
    and (select count(distinct o ->> 'value') from jsonb_array_elements(v) o) = jsonb_array_length(v);
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin authorisation
-- Admin = a row in admin_users. Being signed in is NOT enough.
-- Rows are managed only by the service role (scripts/create-admin.mjs).
-- -----------------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create policy "admins can read their own admin row"
  on public.admin_users for select
  to authenticated
  using (user_id = (select auth.uid()));

-- SECURITY DEFINER so policies can consult admin_users without granting
-- broad read access to it. Lives in the non-exposed `private` schema.
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- Store settings (single row). Public business info only — nothing secret.
-- -----------------------------------------------------------------------------
create table public.store_settings (
  id boolean primary key default true check (id),
  store_name text not null default 'Gift Store' check (length(btrim(store_name)) between 1 and 120),
  currency_code text not null default 'MKD' check (currency_code ~ '^[A-Z]{3}$'),
  delivery_fee_minor integer not null default 0 check (delivery_fee_minor >= 0),
  free_delivery_threshold_minor integer check (free_delivery_threshold_minor > 0),
  delivery_estimate jsonb check (private.is_localized_text(delivery_estimate, false)),
  support_phone text check (length(support_phone) <= 40),
  support_email text check (length(support_email) <= 200),
  business_address text check (length(business_address) <= 500),
  instagram_url text check (instagram_url ~ '^https://'),
  facebook_url text check (facebook_url ~ '^https://'),
  tiktok_url text check (tiktok_url ~ '^https://'),
  whatsapp_number text check (length(whatsapp_number) <= 40),
  updated_at timestamptz not null default now()
);
alter table public.store_settings enable row level security;

insert into public.store_settings (id) values (true);

create trigger store_settings_updated_at
  before update on public.store_settings
  for each row execute function private.set_updated_at();

create policy "anyone can read store settings"
  on public.store_settings for select
  to anon, authenticated
  using (true);

create policy "admins can update store settings"
  on public.store_settings for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- Categories
-- -----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  name jsonb not null check (private.is_localized_text(name, true)),
  description jsonb check (private.is_localized_text(description, false)),
  image_path text check (length(image_path) <= 300),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.categories enable row level security;

create index categories_active_sort_idx on public.categories (sort_order) where is_active;

create trigger categories_updated_at
  before update on public.categories
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Products
-- Never hard-deleted once ordered (order_items will reference with RESTRICT).
-- "Personalisable" is derived from having personalisation fields.
-- -----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 100),
  name jsonb not null check (private.is_localized_text(name, true)),
  short_description jsonb check (private.is_localized_text(short_description, false)),
  description jsonb check (private.is_localized_text(description, false)),
  price_minor integer not null check (price_minor >= 0),
  sale_price_minor integer check (sale_price_minor >= 0 and sale_price_minor < price_minor),
  sku text unique check (sku ~ '^[A-Za-z0-9._-]{1,64}$'),
  stock integer not null default 0 check (stock >= 0),
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  is_new boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;

create index products_active_created_idx on public.products (created_at desc) where status = 'active';
create index products_featured_idx on public.products (created_at desc) where status = 'active' and is_featured;

create trigger products_updated_at
  before update on public.products
  for each row execute function private.set_updated_at();

-- Many-to-many so products can sit in several groupings (categories today;
-- recipient/occasion groupings later via a `kind` column on categories).
create table public.product_categories (
  product_id uuid not null references public.products (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (product_id, category_id)
);
alter table public.product_categories enable row level security;

create index product_categories_category_idx on public.product_categories (category_id);

-- -----------------------------------------------------------------------------
-- Product images. Main image = lowest sort_order.
-- storage_path is relative to the product-images bucket.
-- -----------------------------------------------------------------------------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique
    check (storage_path ~ '^products/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|avif)$'),
  alt_text jsonb check (private.is_localized_text(alt_text, false)),
  width integer check (width > 0),
  height integer check (height > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.product_images enable row level security;

create index product_images_product_sort_idx on public.product_images (product_id, sort_order);

-- -----------------------------------------------------------------------------
-- Personalisation fields (data-driven; never hard-coded in the UI).
-- -----------------------------------------------------------------------------
create table public.personalization_fields (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label jsonb not null check (private.is_localized_text(label, true)),
  type public.personalization_field_type not null,
  required boolean not null default false,
  placeholder jsonb check (private.is_localized_text(placeholder, false)),
  help_text jsonb check (private.is_localized_text(help_text, false)),
  max_length integer check (max_length between 1 and 500),
  options jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personalization_fields_options_type_check check (
    (type = 'select' and private.is_valid_select_options(options))
    or (type <> 'select' and options is null)
  ),
  constraint personalization_fields_max_length_type_check check (
    max_length is null or type in ('text', 'textarea')
  )
);
alter table public.personalization_fields enable row level security;

create index personalization_fields_product_sort_idx on public.personalization_fields (product_id, sort_order);

create trigger personalization_fields_updated_at
  before update on public.personalization_fields
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS policies: public reads only what is live; admins manage everything.
-- `(select private.is_admin())` is wrapped so it is evaluated once per query.
-- -----------------------------------------------------------------------------
create policy "public reads active categories; admins read all"
  on public.categories for select
  to anon, authenticated
  using (is_active or (select private.is_admin()));
create policy "admins insert categories" on public.categories for insert
  to authenticated with check ((select private.is_admin()));
create policy "admins update categories" on public.categories for update
  to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete categories" on public.categories for delete
  to authenticated using ((select private.is_admin()));

create policy "public reads active products; admins read all"
  on public.products for select
  to anon, authenticated
  using (status = 'active' or (select private.is_admin()));
create policy "admins insert products" on public.products for insert
  to authenticated with check ((select private.is_admin()));
create policy "admins update products" on public.products for update
  to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete products" on public.products for delete
  to authenticated using ((select private.is_admin()));

create policy "public reads links of active products; admins read all"
  on public.product_categories for select
  to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
    or (select private.is_admin())
  );
create policy "admins insert product categories" on public.product_categories for insert
  to authenticated with check ((select private.is_admin()));
create policy "admins delete product categories" on public.product_categories for delete
  to authenticated using ((select private.is_admin()));

create policy "public reads images of active products; admins read all"
  on public.product_images for select
  to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
    or (select private.is_admin())
  );
create policy "admins insert product images" on public.product_images for insert
  to authenticated with check ((select private.is_admin()));
create policy "admins update product images" on public.product_images for update
  to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete product images" on public.product_images for delete
  to authenticated using ((select private.is_admin()));

create policy "public reads fields of active products; admins read all"
  on public.personalization_fields for select
  to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
    or (select private.is_admin())
  );
create policy "admins insert personalization fields" on public.personalization_fields for insert
  to authenticated with check ((select private.is_admin()));
create policy "admins update personalization fields" on public.personalization_fields for update
  to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete personalization fields" on public.personalization_fields for delete
  to authenticated using ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- Table privileges (explicit). RLS then restricts rows.
-- -----------------------------------------------------------------------------
revoke all on public.admin_users, public.store_settings, public.categories, public.products,
  public.product_categories, public.product_images, public.personalization_fields
  from anon, authenticated;

grant select on public.store_settings, public.categories, public.products,
  public.product_categories, public.product_images, public.personalization_fields
  to anon, authenticated;

grant update (store_name, currency_code, delivery_fee_minor, free_delivery_threshold_minor,
  delivery_estimate, support_phone, support_email, business_address, instagram_url,
  facebook_url, tiktok_url, whatsapp_number)
  on public.store_settings to authenticated;

grant insert, update, delete on public.categories, public.products,
  public.product_images, public.personalization_fields to authenticated;
grant insert, delete on public.product_categories to authenticated;

grant select on public.admin_users to authenticated;

grant all on public.admin_users, public.store_settings, public.categories, public.products,
  public.product_categories, public.product_images, public.personalization_fields
  to service_role;

-- -----------------------------------------------------------------------------
-- Function privileges (explicit). Postgres grants EXECUTE to PUBLIC by default.
-- -----------------------------------------------------------------------------
revoke execute on function private.is_localized_text(jsonb, boolean) from public, anon, authenticated;
revoke execute on function private.is_valid_select_options(jsonb) from public, anon, authenticated;
revoke execute on function private.set_updated_at() from public, anon, authenticated;
revoke execute on function private.is_admin() from public, anon, authenticated;

-- Needed because CHECK constraints call these as the writing role.
grant execute on function private.is_localized_text(jsonb, boolean) to authenticated, service_role;
grant execute on function private.is_valid_select_options(jsonb) to authenticated, service_role;
-- Needed because RLS policies call it as the querying role. Returns false for anon.
grant execute on function private.is_admin() to anon, authenticated, service_role;
