-- Initial categories defined by the business brief.
-- Macedonian and Albanian names are DRAFT translations pending native review;
-- owners can edit them in /admin/categories.
insert into public.categories (slug, name, sort_order) values
  ('personalised-gifts', '{"en": "Personalised Gifts", "mk": "Персонализирани подароци", "sq": "Dhurata të personalizuara"}', 10),
  ('jewellery',          '{"en": "Jewellery", "mk": "Накит", "sq": "Bizhuteri"}', 20),
  ('keychains',          '{"en": "Keychains", "mk": "Приврзоци за клучеви", "sq": "Varëse çelësash"}', 30),
  ('home-decor',         '{"en": "Home & Decor", "mk": "Дом и декор", "sq": "Shtëpi dhe dekor"}', 40),
  ('love-anniversary',   '{"en": "Love & Anniversary", "mk": "Љубов и годишнини", "sq": "Dashuri dhe përvjetor"}', 50)
on conflict (slug) do nothing;
