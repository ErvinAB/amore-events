"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LocalizedText } from "@/i18n/config";
import { DEFAULT_MAX, type FieldType, type PersonalizationField } from "@/lib/personalization/validate";
import { slugify } from "@/lib/slug";
import { useActionForm } from "@/components/admin/use-action-form";
import type { ActionState } from "@/lib/validation/common";
import { LocalizedField } from "@/components/admin/localized-field";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Select, TextInput, describedBy } from "@/components/ui/field";
import { adminT, fillAdmin } from "@/messages/admin";
import { deletePersonalizationField, reorderPersonalizationFields, savePersonalizationField } from "./personalization-actions";

const t = adminT.personalisation;

export function PersonalizationEditor({ productId, fields }: { productId: string; fields: PersonalizationField[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, startTransition] = useTransition();

  function move(index: number, delta: number) {
    const ids = fields.map((f) => f.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id);
    startTransition(async () => {
      await reorderPersonalizationFields(productId, ids);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!window.confirm(t.removeConfirm)) return;
    startTransition(async () => {
      await deletePersonalizationField(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">{t.help}</p>
      {fields.length === 0 && !adding ? <p className="text-ink-muted">{t.empty}</p> : null}
      <ol className="flex flex-col gap-4" aria-busy={busy}>
        {fields.map((field, index) => (
          <li key={field.id} className="rounded-control border border-line p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {index + 1}. {field.label.en}
                <span className="ml-2 text-sm font-normal text-ink-muted">
                  {t.types[field.type]}
                  {field.required ? ` · ${t.required}` : ""}
                </span>
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label={adminT.common.moveUp}>
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => move(index, 1)}
                  disabled={busy || index === fields.length - 1}
                  aria-label={adminT.common.moveDown}
                >
                  ↓
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove(field.id)} disabled={busy}>
                  {t.remove}
                </Button>
              </div>
            </div>
            <FieldForm productId={productId} field={field} onSaved={() => router.refresh()} />
          </li>
        ))}
      </ol>
      {adding ? (
        <div className="rounded-control border border-ribbon/40 p-4">
          <p className="mb-4 font-medium">{t.newField}</p>
          <FieldForm
            productId={productId}
            onSaved={() => {
              setAdding(false);
              router.refresh();
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setAdding(true)}>
            {t.add}
          </Button>
        </div>
      )}
    </div>
  );
}

type OptionRow = { key: string; value: string; label: Partial<LocalizedText>; valueTouched: boolean };

function FieldForm({
  productId,
  field,
  onSaved,
  onCancel,
}: {
  productId: string;
  field?: PersonalizationField;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const { state, pending, formRef, onSubmit } = useActionForm(async (prev: ActionState, form: FormData) => {
    const r = await savePersonalizationField(prev, form);
    if (r.ok) onSaved();
    return r;
  });
  const [type, setType] = useState<FieldType>(field?.type ?? "text");
  const [options, setOptions] = useState<OptionRow[]>(
    () =>
      field?.options?.map((o, i) => ({ key: `o${i}`, value: o.value, label: o.label, valueTouched: true })) ?? [
        { key: "o0", value: "", label: {}, valueTouched: false },
      ],
  );
  const e = state.errors ?? {};
  const uid = field?.id ?? "new";
  const isText = type === "text" || type === "textarea";

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {state.message ? <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage> : null}
      <input type="hidden" name="product_id" value={productId} />
      {field ? <input type="hidden" name="id" value={field.id} /> : null}

      <LocalizedField name="label" label={t.label} value={field?.label} required maxLength={80} error={e.label} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`type-${uid}`} label={t.type}>
          <Select id={`type-${uid}`} name="type" value={type} onChange={(ev) => setType(ev.target.value as FieldType)}>
            {(["text", "textarea", "select", "date"] as const).map((v) => (
              <option key={v} value={v}>
                {t.types[v]}
              </option>
            ))}
          </Select>
        </Field>
        {isText ? (
          <Field
            id={`max-${uid}`}
            label={t.maxLength}
            optionalLabel={adminT.common.optional}
            hint={fillAdmin(t.maxLengthHelp, { default: DEFAULT_MAX[type] })}
            error={e.max_length}
          >
            <TextInput
              id={`max-${uid}`}
              name="max_length"
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              defaultValue={field?.max_length ?? ""}
              aria-invalid={!!e.max_length || undefined}
              aria-describedby={describedBy(`max-${uid}`, { hint: true, error: e.max_length })}
            />
          </Field>
        ) : null}
      </div>

      <Checkbox id={`req-${uid}`} name="required" label={t.required} defaultChecked={field?.required ?? false} />

      {type === "select" ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">{t.options}</legend>
          {e.options ? (
            <p className="text-sm text-error" role="alert">
              {e.options}
            </p>
          ) : null}
          {options.map((o, i) => (
            <div key={o.key} className="flex flex-col gap-3 rounded-control bg-tissue/50 p-3">
              <LocalizedField
                name={`options.${i}.label`}
                label={`${t.optionLabel} ${i + 1}`}
                value={o.label as LocalizedText}
                required
                maxLength={80}
                error={e[`options.${i}.label`]}
                onEnglishChange={(v) =>
                  setOptions((rows) => rows.map((r, j) => (j === i && !r.valueTouched ? { ...r, value: slugify(v, 40) } : r)))
                }
              />
              <div className="flex items-end gap-3">
                <Field id={`opt-${uid}-${i}`} label={t.optionValue} hint={t.optionValueHelp} error={e[`options.${i}.value`]} className="flex-1">
                  <TextInput
                    id={`opt-${uid}-${i}`}
                    name={`options.${i}.value`}
                    value={o.value}
                    onChange={(ev) =>
                      setOptions((rows) => rows.map((r, j) => (j === i ? { ...r, value: ev.target.value, valueTouched: true } : r)))
                    }
                    maxLength={40}
                    autoCapitalize="none"
                    spellCheck={false}
                    className="min-h-10 text-sm"
                    aria-invalid={!!e[`options.${i}.value`] || undefined}
                  />
                </Field>
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() => setOptions((rows) => rows.filter((_, j) => j !== i))}
                  disabled={options.length === 1}
                >
                  {t.removeOption}
                </Button>
              </div>
            </div>
          ))}
          <div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setOptions((rows) => [...rows, { key: `o${Date.now()}`, value: "", label: {}, valueTouched: false }])}
              disabled={options.length >= 50}
            >
              {t.addOption}
            </Button>
          </div>
        </fieldset>
      ) : null}

      {isText ? (
        <LocalizedField name="placeholder" label={t.placeholder} value={field?.placeholder} maxLength={120} error={e.placeholder} />
      ) : null}
      <LocalizedField name="help_text" label={t.helpText} value={field?.help_text} maxLength={300} error={e.help_text} />

      <div className="flex gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? adminT.common.saving : t.saveField}
        </Button>
        {onCancel ? (
          <Button size="sm" variant="quiet" onClick={onCancel}>
            {adminT.common.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
