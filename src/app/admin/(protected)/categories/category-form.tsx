"use client";

import { useState } from "react";
import { saveCategory } from "./actions";
import { useActionForm } from "@/components/admin/use-action-form";
import type { LocalizedText } from "@/i18n/config";
import { slugify } from "@/lib/slug";
import { LocalizedField } from "@/components/admin/localized-field";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, TextInput, describedBy } from "@/components/ui/field";
import { adminT } from "@/messages/admin";

export type CategoryFormValues = {
  id?: string;
  name: LocalizedText | null;
  description: LocalizedText | null;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

export function CategoryForm({ initial }: { initial: CategoryFormValues }) {
  const t = adminT;
  const { state, pending, formRef, onSubmit } = useActionForm(saveCategory);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const e = state.errors ?? {};

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-6" noValidate>
      {state.message ? <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage> : null}
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      <LocalizedField
        name="name"
        label={t.categories.name}
        value={initial.name}
        required
        maxLength={120}
        error={e.name}
        onEnglishChange={(v) => !slugTouched && setSlug(slugify(v))}
      />

      <Field id="slug" label={t.categories.slug} hint={t.categories.slugHelp.replace("{slug}", slug || "…")} error={e.slug}>
        <TextInput
          id="slug"
          name="slug"
          value={slug}
          onChange={(ev) => {
            setSlugTouched(true);
            setSlug(ev.target.value);
          }}
          required
          maxLength={80}
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={!!e.slug || undefined}
          aria-describedby={describedBy("slug", { hint: true, error: e.slug })}
        />
      </Field>

      <LocalizedField
        name="description"
        label={t.categories.description}
        value={initial.description}
        multiline
        rows={3}
        maxLength={2000}
        error={e.description}
      />

      <Field id="sort_order" label={t.categories.sortOrder} hint={t.categories.sortHelp} error={e.sort_order}>
        <TextInput
          id="sort_order"
          name="sort_order"
          type="number"
          inputMode="numeric"
          defaultValue={initial.sort_order}
          className="max-w-32"
          aria-describedby={describedBy("sort_order", { hint: true, error: e.sort_order })}
        />
      </Field>

      <Checkbox id="is_active" name="is_active" label={t.categories.isActive} defaultChecked={initial.is_active} />

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t.common.saving : initial.id ? t.common.save : t.common.create}
        </Button>
      </div>
    </form>
  );
}
