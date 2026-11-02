-- =============================================================================
-- Storage: product-images bucket.
-- Public read (served via public URLs / Next image optimisation).
-- Only admins may upload, replace or delete, and only under known prefixes.
-- Size and type limits are enforced by the bucket itself.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "admins read product images objects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()));

create policy "admins upload product images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (select private.is_admin())
    and (storage.foldername(name))[1] in ('products', 'categories')
  );

create policy "admins update product images objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()))
  with check (
    bucket_id = 'product-images'
    and (select private.is_admin())
    and (storage.foldername(name))[1] in ('products', 'categories')
  );

create policy "admins delete product images objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()));
