"use client";

import { useState } from "react";
import { saveProduct } from "./actions";
import { useActionForm } from "@/components/admin/use-action-form";
import type { LocalizedText } from "@/i18n/config";
import { slugify } from "@/lib/slug";
import { moneyInputValue } from "@/lib/validation/common";
import { LocalizedField } from "@/components/admin/localized-field";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Select, TextInput, describedBy } from "@/components/ui/field";
import { adminT, fillAdmin } from "@/messages/admin";

export type ProductFormValues = {
  id?: string;
  name: LocalizedText | null;
  short_description: LocalizedText | null;
  description: LocalizedText | null;
  slug: string;
  price_minor: number | null;
  sale_price_minor: number | null;
  sku: string | null;
  stock: number;
  status: "draft" | "active" | "archived";
  is_featured: boolean;
  is_new: boolean;
  category_ids: string[];
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-control border border-line bg-paper p-4 sm:p-6">
      <h2 className="heading-3">{title}</h2>
      {children}
    </section>
  );
}

export function ProductForm({
  initial,
  categories,
  currency,
}: {
  initial: ProductFormValues;
  categories: { id: string; name: string }[];
  currency: string;
}) {
  const t = adminT;
  const { state, pending, formRef, onSubmit } = useActionForm(saveProduct);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const e = state.errors ?? {};
  const priceHint = fillAdmin(t.products.priceHelp, { currency });

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-6" noValidate>
      {state.message ? <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage> : null}
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      <Section title={t.products.sections.basics}>
        <LocalizedField
          name="name"
          label={t.products.name}
          value={initial.name}
          required
          maxLength={160}
          error={e.name}
          onEnglishChange={(v) => !slugTouched && setSlug(slugify(v, 100))}
        />
        <Field id="slug" label={t.products.slug} hint={t.products.slugHelp.replace("{slug}", slug || "…")} error={e.slug}>
          <TextInput
            id="slug"
            name="slug"
            value={slug}
            onChange={(ev) => {
              setSlugTouched(true);
              setSlug(ev.target.value);
            }}
            maxLength={100}
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!e.slug || undefined}
            aria-describedby={describedBy("slug", { hint: true, error: e.slug })}
          />
        </Field>
        <LocalizedField
          name="short_description"
          label={t.products.shortDescription}
          hint={t.products.shortDescriptionHelp}
          value={initial.short_description}
          maxLength={300}
          error={e.short_description}
        />
        <LocalizedField
          name="description"
          label={t.products.description}
          value={initial.description}
          multiline
          rows={5}
          maxLength={5000}
          error={e.description}
        />
      </Section>

      <Section title={t.products.sections.pricing}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="price" label={`${t.products.price} (${currency})`} hint={priceHint} error={e.price}>
            <TextInput
              id="price"
              name="price"
              inputMode="decimal"
              defaultValue={moneyInputValue(initial.price_minor)}
              aria-invalid={!!e.price || undefined}
              aria-describedby={describedBy("price", { hint: true, error: e.price })}
            />
          </Field>
          <Field
            id="sale_price"
            label={`${t.products.salePrice} (${currency})`}
            optionalLabel={t.common.optional}
            hint={t.products.salePriceHelp}
            error={e.sale_price}
          >
            <TextInput
              id="sale_price"
              name="sale_price"
              inputMode="decimal"
              defaultValue={moneyInputValue(initial.sale_price_minor)}
              aria-invalid={!!e.sale_price || undefined}
              aria-describedby={describedBy("sale_price", { hint: true, error: e.sale_price })}
            />
          </Field>
          <Field id="stock" label={t.products.stock} error={e.stock}>
            <TextInput
              id="stock"
              name="stock"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={initial.stock}
              aria-invalid={!!e.stock || undefined}
              aria-describedby={describedBy("stock", { error: e.stock })}
            />
          </Field>
          <Field id="sku" label={t.products.sku} optionalLabel={t.common.optional} error={e.sku}>
            <TextInput
              id="sku"
              name="sku"
              defaultValue={initial.sku ?? ""}
              maxLength={64}
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={!!e.sku || undefined}
              aria-describedby={describedBy("sku", { error: e.sku })}
            />
          </Field>
        </div>
      </Section>

      <Section title={t.products.sections.visibility}>
        <Field id="status" label={t.products.status} hint={t.products.statusHelp} error={e.status}>
          <Select id="status" name="status" defaultValue={initial.status} className="max-w-xs" aria-describedby="status-hint">
            <option value="draft">{t.products.statuses.draft}</option>
            <option value="active">{t.products.statuses.active}</option>
            <option value="archived">{t.products.statuses.archived}</option>
          </Select>
        </Field>
        <p className="-mt-2 text-sm text-ink-muted">{t.products.archiveHint}</p>
        <Checkbox id="is_featured" name="is_featured" label={t.products.featured} defaultChecked={initial.is_featured} />
        <Checkbox id="is_new" name="is_new" label={t.products.isNew} defaultChecked={initial.is_new} />
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-medium">{t.products.categories}</legend>
          {categories.length ? (
            categories.map((c) => (
              <Checkbox
                key={c.id}
                id={`cat-${c.id}`}
                name="category_ids"
                value={c.id}
                label={c.name}
                defaultChecked={initial.category_ids.includes(c.id)}
              />
            ))
          ) : (
            <p className="text-sm text-ink-muted">{t.products.noCategories}</p>
          )}
        </fieldset>
      </Section>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? t.common.saving : initial.id ? t.common.save : t.common.create}
        </Button>
      </div>
    </form>
  );
}
