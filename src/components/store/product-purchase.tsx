"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { localized, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import {
  charLength,
  maxLengthFor,
  validatePersonalization,
  type PersonalizationErrorCode,
  type PersonalizationField,
} from "@/lib/personalization/validate";
import { cartActions } from "@/lib/cart/store";
import { MAX_QTY } from "@/lib/cart/lines";
import { Button } from "@/components/ui/button";
import { Select, TextArea, TextInput } from "@/components/ui/field";

type Props = {
  productId: string;
  fields: PersonalizationField[];
  stock: number;
  locale: Locale;
  t: Pick<Dictionary, "product" | "personalise">;
  bagHref: string;
};

/**
 * Personalisation + quantity + Add to bag. Fields are rendered from data.
 * Validation here is for the customer's benefit only; checkout re-validates
 * on the server against the database.
 */
export function ProductPurchase({ productId, fields, stock, locale, t, bagHref }: Props) {
  const uid = useId();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, PersonalizationErrorCode>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const soldOut = stock <= 0;
  const maxQty = Math.max(1, Math.min(MAX_QTY, stock));

  const errorText = (f: PersonalizationField, code: PersonalizationErrorCode) =>
    code === "tooLong" ? t.personalise.errors.tooLong.replace("{max}", String(maxLengthFor(f))) : t.personalise.errors[code];

  const previewParts = fields
    .filter((f) => (f.type === "text" || f.type === "textarea") && values[f.id]?.trim())
    .map((f) => values[f.id].trim());

  function update(id: string, v: string) {
    setValues((s) => ({ ...s, [id]: v }));
    setAdded(false);
    if (errors[id])
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
  }

  function add() {
    const result = validatePersonalization(fields, values);
    if (!result.ok) {
      setErrors(result.errors);
      setSummaryError(true);
      const first = fields.find((f) => result.errors[f.id]);
      if (first) document.getElementById(`${uid}-${first.id}`)?.focus();
      return;
    }
    setErrors({});
    setSummaryError(false);
    cartActions.add({ productId, quantity: qty, personalization: result.values });
    setAdded(true);
  }

  return (
    <div className="flex flex-col gap-6">
      {fields.length ? (
        <section aria-labelledby={`${uid}-title`} className="flex flex-col gap-5 rounded-image bg-tissue p-5 sm:p-6">
          <div>
            <h2 id={`${uid}-title`} className="heading-3">
              {t.personalise.title}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{t.personalise.intro}</p>
          </div>
          {fields.map((f) => {
            const id = `${uid}-${f.id}`;
            const label = localized(f.label, locale);
            const help = localized(f.help_text, locale);
            const placeholder = localized(f.placeholder, locale) || undefined;
            const err = errors[f.id];
            const max = maxLengthFor(f);
            const describedBy = [help ? `${id}-help` : null, max ? `${id}-count` : null, err ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
            const common = {
              id,
              name: f.id,
              value: values[f.id] ?? "",
              required: f.required,
              "aria-invalid": err ? true : undefined,
              "aria-describedby": describedBy,
            } as const;
            return (
              <div key={f.id} className="flex flex-col gap-1.5">
                <label htmlFor={id} className="text-sm font-medium">
                  {label}
                  {!f.required ? <span className="font-normal text-ink-muted"> ({t.personalise.optional})</span> : null}
                </label>
                {f.type === "text" ? (
                  <TextInput {...common} placeholder={placeholder} autoComplete="off" maxLength={(max ?? 60) + 10} onChange={(e) => update(f.id, e.target.value)} />
                ) : f.type === "textarea" ? (
                  <TextArea {...common} placeholder={placeholder} rows={3} maxLength={(max ?? 300) + 20} onChange={(e) => update(f.id, e.target.value)} />
                ) : f.type === "select" ? (
                  <Select {...common} onChange={(e) => update(f.id, e.target.value)}>
                    <option value="">{t.personalise.choose}</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {localized(o.label, locale)}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <TextInput {...common} type="date" min="1900-01-01" max="2100-12-31" onChange={(e) => update(f.id, e.target.value)} />
                )}
                {help ? (
                  <p id={`${id}-help`} className="text-sm text-ink-muted">
                    {help}
                  </p>
                ) : null}
                {max ? (
                  <p id={`${id}-count`} className={`text-xs ${charLength(values[f.id] ?? "") > max ? "text-error" : "text-ink-muted"}`} aria-live="polite">
                    {t.personalise.charsLeft.replace("{count}", String(Math.max(0, max - charLength(values[f.id] ?? ""))))}
                  </p>
                ) : null}
                {err ? (
                  <p id={`${id}-error`} className="text-sm text-error">
                    {errorText(f, err)}
                  </p>
                ) : null}
              </div>
            );
          })}
          {previewParts.length ? (
            <figure className="border-t border-tissue-deep pt-4">
              <figcaption className="text-xs text-ink-muted">{t.personalise.previewLabel}</figcaption>
              <p className="mt-1 font-serif text-h3 break-words whitespace-pre-line italic">{previewParts.join(" · ")}</p>
            </figure>
          ) : null}
        </section>
      ) : null}

      {soldOut ? (
        <p className="rounded-control border border-line px-4 py-3 text-ink-muted">{t.product.unavailable}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-stretch gap-3">
            <div className="flex items-center rounded-pill border border-line-strong" role="group" aria-label={t.product.quantity}>
              <button
                type="button"
                className="flex min-h-touch min-w-touch items-center justify-center text-lg disabled:opacity-40"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label={t.product.decrease}
              >
                −
              </button>
              <output className="w-8 text-center tabular-nums" aria-live="polite">
                {qty}
              </output>
              <button
                type="button"
                className="flex min-h-touch min-w-touch items-center justify-center text-lg disabled:opacity-40"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                aria-label={t.product.increase}
              >
                +
              </button>
            </div>
            <Button className="flex-1" onClick={add}>
              {t.product.addToBag}
            </Button>
          </div>
          <div aria-live="polite" className="min-h-6 text-sm">
            {added ? (
              <p className="text-success">
                {t.product.added}.{" "}
                <Link href={bagHref} className="text-ink underline underline-offset-4">
                  {t.product.viewBag}
                </Link>
              </p>
            ) : summaryError && Object.keys(errors).length ? (
              <p className="text-error">{t.product.fixErrors}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
